const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { uploadRoot } = require("../middlewares/upload");

const describe = (file) => ({
  filename: file.filename,
  originalName: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  url: `/${env.UPLOAD_DIR}/${file.filename}`,
});

const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No file was uploaded");
  sendSuccess(res, 201, describe(req.file));
});

const uploadMany = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest("No files were uploaded");
  sendSuccess(res, 201, req.files.map(describe), { total: req.files.length });
});

const listUploads = asyncHandler(async (req, res) => {
  const names = await fs.readdir(uploadRoot);

  const files = await Promise.all(
    names
      .filter((name) => !name.startsWith("."))
      .map(async (name) => {
        const stats = await fs.stat(path.join(uploadRoot, name));
        return {
          filename: name,
          size: stats.size,
          uploadedAt: stats.birthtime,
          url: `/${env.UPLOAD_DIR}/${name}`,
        };
      }),
  );

  sendSuccess(res, 200, files, { total: files.length });
});

const deleteUpload = asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  const target = path.join(uploadRoot, filename);

  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code === "ENOENT") throw ApiError.notFound("File not found");
    throw error;
  }

  res.status(200).json({ success: true, message: "File deleted" });
});

module.exports = { uploadSingle, uploadMany, listUploads, deleteUpload };
