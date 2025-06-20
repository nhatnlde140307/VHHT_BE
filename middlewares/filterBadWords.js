
export const badWords = [
  // Từ tục trực tiếp & phổ biến
  'cặc', 'lồn', 'địt', 'đụ', 'bú', 'nứng', 'chim', 'buồi', 'cu', 'hòn dái',
  'loz', 'clmm', 'vkl', 'vcl', 'đmm', 'dm', 'dmm', 'cc', 'dcm', 'dkm',
  'djt', 'clm', 'đệch', 'đéo', 'mẹ kiếp', 'vãi lồn',

  // Không dấu
  'cac', 'lon', 'dit', 'du', 'bu', 'nung', 'buoi', 'hon dai', 'deo', 'me kiep',

  // Né filter
  'c*cc', 'đ**', 'l**', 'đ.m', 'd.mẹ', 'cl**', 'clm', 'c.l.m', 'lozz',
  'l0n', 'b0z', 'ch0', 'djt me', 'fck', 'f*ck', 'sh*t', 'd*mn',

  // Xúc phạm cá nhân
  'mẹ mày', 'bố mày', 'đm mày', 'địt mẹ', 'con đĩ', 'con cave', 'con chó', 'con cặc',
  'óc chó', 'óc lợn', 'óc trâu', 'súc vật', 'bố láo', 'mất dạy', 'khốn nạn', 'cmm',
  'xàm lồn', 'xàm lol', 'vlol', 'ngu vcl', 'clgt', 'v~', 'vl vl',

  // Tiếng Anh tục tĩu
  'fuck', 'f*ck', 'bitch', 'asshole', 'shit', 'sh*t', 'd*mn', 'motherf*cker',
  'faggot', 'gaylord', 'cunt', 'retard', 'jerk', 'slut'
];


// Chuẩn hóa chuỗi: bỏ dấu, ký tự đặc biệt, viết thường
function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')  // Bỏ dấu tiếng Việt
    .replace(/[^a-zA-Z0-9 ]/g, '')    // Bỏ ký tự đặc biệt
    .toLowerCase();
}

// Middleware 1: Chặn comment có từ bậy (403)
export function filterBadWords(req, res, next) {
  const { content } = req.body;

  if (typeof content !== 'string') {
    return res.status(400).json({ message: 'Nội dung không hợp lệ.' });
  }

  const normalized = normalize(content);

  for (const word of badWords) {
    if (normalized.includes(normalize(word))) {
      return res.status(403).json({ message: 'Nội dung chứa từ ngữ không phù hợp.' });
    }
  }

  next();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Middleware 2: Gạch từ bậy bằng ***
export function censorBadWords(req, res, next) {
  let { content } = req.body;

  if (typeof content !== 'string') {
    return res.status(400).json({ message: 'Nội dung không hợp lệ.' });
  }

  for (const word of badWords) {
    const safeWord = escapeRegex(word); 
    const regex = new RegExp(`\\b${safeWord}\\b`, 'gi');
    content = content.replace(regex, '***');
  }

  req.body.content = content;
  next();
}