jest.mock('../models/donationTransaction.model.js');
import DonationTransaction from '../models/donationTransaction.model.js';

const fakeTransactions = [
  { amount: 100, donor: 'abc' },
  { amount: 200, donor: 'xyz' }
];

DonationTransaction.find.mockReturnValue({
  sort: jest.fn().mockReturnValue(Promise.resolve(fakeTransactions))
});
