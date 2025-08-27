import mongoose from "mongoose";
import Campaign from "../models/campaign.model.js";
import Department from "../models/departments.model.js";
import Phase from "../models/phase.model.js";
import PhaseDay from "../models/phaseDay.model.js";
import Checkin from "../models/checkin.model.js";
import Task from "../models/task.model.js";
import User from "../models/users.model.js"
import DonationCampaign from "../models/donationCampaign.model.js"
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const timeMatch = (from, to) => {
  const m = {};
  if (from || to) m.checkinTime = {};
  if (from) m.checkinTime.$gte = new Date(from);
  if (to) m.checkinTime.$lte = new Date(to);
  return m;
};

const pickSections = (sections, map) => {
  if (!sections || sections.length === 0) return Object.values(map);
  return sections.map((k) => map[k]).filter(Boolean);
};

async function getOverview(campaignId) {
  const c = await Campaign.findById(campaignId).lean();
  if (!c) throw new Error("Campaign not found");

  const [deptCount, phaseCount, phasedayCount] = await Promise.all([
    Department.countDocuments({ campaignId }),
    Phase.countDocuments({ campaignId }),
    PhaseDay.countDocuments({ campaignId }),
  ]);

  return {
    overview: {
      name: c.name || null,
      description: c.description || null,
      status: c.status || null,
      category: c.category || null,
      location: c.location || null,
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      certificatesIssued: !!c.certificatesIssued,
      counts: { departments: deptCount, phases: phaseCount, phaseDays: phasedayCount },
    },
  };
}

async function getVolunteerStats(campaignId) {
  const c = await Campaign.findById(campaignId, { volunteers: 1 }).lean();
  const vols = c?.volunteers || [];
  const total = vols.length;

  const byStatus = vols.reduce((a, v) => {
    a[v.status] = (a[v.status] || 0) + 1;
    return a;
  }, {});

  const evaluation = vols.reduce((a, v) => {
    if (v.evaluation) a[v.evaluation] = (a[v.evaluation] || 0) + 1;
    return a;
  }, {});

  const registeredSeries = {};
  for (const v of vols) {
    if (!v.registeredAt) continue;
    const d = new Date(v.registeredAt).toISOString().slice(0, 10);
    registeredSeries[d] = (registeredSeries[d] || 0) + 1;
  }

  return {
    volunteers: {
      total,
      byStatus,
      evaluation,
      registeredSeries,
    },
  };
}

async function getDepartmentStats(campaignId) {
  const depts = await Department.find({ campaignId }).lean();
  return {
    departments: depts.map((d) => ({
      _id: d._id,
      name: d.name,
      maxMembers: d.maxMembers || 0,
      members: (d.members || []).length,
    })),
  };
}

async function getPhaseStats(campaignId) {
  const [phases, days] = await Promise.all([
    Phase.find({ campaignId }).lean(),
    PhaseDay.find({ campaignId }).lean(),
  ]);

  return {
    phases: phases.map((p) => ({
      _id: p._id,
      name: p.name,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
    })),
    phaseDays: days.map((d) => ({
      _id: d._id,
      phaseId: d.phaseId,
      date: d.date || null,
      status: d.status || null,
    })),
  };
}

async function getCheckinStats(campaignId, from, to) {
  const match = { campaignId: toObjectId(campaignId), ...timeMatch(from, to) };

  const [summary, byHour, byMethod] = await Promise.all([
    Checkin.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: 1 }, uniqUsers: { $addToSet: "$userId" } } },
      { $project: { _id: 0, total: 1, uniqUsers: { $size: "$uniqUsers" } } },
    ]),
    Checkin.aggregate([
      { $match: match },
      { $addFields: { hour: { $hour: "$checkinTime" } } },
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
      { $sort: { hour: 1 } },
    ]),
    Checkin.aggregate([
      { $match: match },
      { $group: { _id: "$method", count: { $sum: 1 } } },
      { $project: { method: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  const approved = await Campaign.aggregate([
    { $match: { _id: toObjectId(campaignId) } },
    { $project: { volunteers: 1 } },
    { $unwind: "$volunteers" },
    { $match: { "volunteers.status": "approved" } },
    { $count: "approved" },
  ]);

  const approvedCount = approved[0]?.approved || 0;
  const uniq = summary[0]?.uniqUsers || 0;
  const attendanceRate = approvedCount ? +(uniq / approvedCount * 100).toFixed(2) : 0;

  return {
    checkins: {
      total: summary[0]?.total || 0,
      uniqueUsers: uniq,
      attendanceRate,
      byHour,
      byMethod,
    },
  };
}

async function getTaskStats(campaignId) {
  const match = { campaignId: toObjectId(campaignId) };

  const [byStatus, assigned, peerAvg, staffScore] = await Promise.all([
    Task.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]),
    Task.aggregate([
      { $match: match },
      { $project: { assigned: { $size: { $ifNull: ["$assignedUsers", []] } } } },
      { $group: { _id: null, totalAssigned: { $sum: "$assigned" } } },
      { $project: { _id: 0, totalAssigned: 1 } },
    ]),
    Task.aggregate([
      { $match: match },
      { $unwind: { path: "$peerReviews", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$_id", avgPeer: { $avg: "$peerReviews.score" } } },
      { $group: { _id: null, avgPeerAll: { $avg: "$avgPeer" } } },
      { $project: { _id: 0, avgPeerAll: { $ifNull: ["$avgPeerAll", 0] } } },
    ]),
    Task.aggregate([
      { $match: match },
      { $group: { _id: null, avgStaff: { $avg: "$staffReview.score" } } },
      { $project: { _id: 0, avgStaff: { $ifNull: ["$avgStaff", 0] } } },
    ]),
  ]);

  return {
    tasks: {
      byStatus,
      totalAssigned: assigned[0]?.totalAssigned || 0,
      avgPeerScore: peerAvg[0]?.avgPeerAll || 0,
      avgStaffScore: staffScore[0]?.avgStaff || 0,
    },
  };
}

async function getMapData(campaignId, from, to) {
  const days = await PhaseDay.find({ campaignId })
    .select({ _id: 1, location: 1, date: 1 })
    .lean();

  const checkins = await Checkin.find({ campaignId, ...timeMatch(from, to) })
    .select({ location: 1, phasedayId: 1 })
    .lean();

  return { map: { phaseDays: days, checkins } };
}

export async function buildDashboard({ campaignId, from, to, sections }) {
  const jobs = {
    overview: () => getOverview(campaignId),
    volunteers: () => getVolunteerStats(campaignId),
    departments: () => getDepartmentStats(campaignId),
    phases: () => getPhaseStats(campaignId),
    checkins: () => getCheckinStats(campaignId, from, to),
    tasks: () => getTaskStats(campaignId),
    map: () => getMapData(campaignId, from, to),
  };

  const selected = pickSections(sections, jobs);
  const results = await Promise.all(selected.map((fn) => fn()));

  return results.reduce((acc, cur) => Object.assign(acc, cur), {});
}

export async function getOverviewStats() {
  const [totalCampaigns, totalUsers] = await Promise.all([
    Campaign.countDocuments(),
    User.countDocuments()
  ])

  // Tổng tiền donate theo rule: totalEnd ?? currentAmount
  const [agg] = await DonationCampaign.aggregate([
    {
      $group: {
        _id: null,
        totalDonationAmount: {
          $sum: { $ifNull: ['$totalEnd', '$currentAmount'] }
        }
      }
    }
  ])

  return {
    totalCampaigns,
    totalUsers,
    totalDonationAmount: agg?.totalDonationAmount ?? 0
  }
}

