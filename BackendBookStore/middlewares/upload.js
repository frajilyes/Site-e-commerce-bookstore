const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const uploadRoot = path.join(__dirname, "..", env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME.get(file.mimetype) || ".bin";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME.keys()].join(", ")}`,
      ),
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 10 },
});


const ascii = (buffer, start, end) => buffer.toString("latin1", start, end);

const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (b) => ["GIF87a", "GIF89a"].includes(ascii(b, 0, 6)),
  "image/webp": (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  "image/avif": (b) =>
    ascii(b, 4, 8) === "ftyp" && ["avif", "avis", "mif1", "msf1"].includes(ascii(b, 8, 12)),
};

const readHead = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    await handle.read(buffer, 0, 16, 0);
    return buffer;
  } finally {
    await handle.close();
  }
};

const verifyImages = async (req, res, next) => {
  const files = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
  if (!files.length) return next();

  try {
    const results = await Promise.all(
      files.map(async (file) => {
        const check = SIGNATURES[file.mimetype];
        return Boolean(check) && check(await readHead(file.path));
      }),
    );

    if (results.every(Boolean)) return next();

    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
    return next(ApiError.badRequest("The uploaded file is not a valid image"));
  } catch (error) {
    return next(error);
  }
};

module.exports = upload;
module.exports.uploadRoot = uploadRoot;
module.exports.verifyImages = verifyImages;
