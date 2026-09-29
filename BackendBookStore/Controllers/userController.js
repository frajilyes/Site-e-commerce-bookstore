
const User = require("../Models/userAuth");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");
const { openSession, closeSession } = require("../utils/generateToken");
const { assertNotSelf } = require("../middlewares/adminMiddleware");
const { notifyPasswordChanged } = require("../Services/passwordReset");

const MAX_ADDRESSES = 10;


const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, req.user);
});

const updateMe = asyncHandler(async (req, res) => {
  const { fullName, phone, avatar } = req.body;

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    returnDocument: "after",
    runValidators: true,
  });

  sendSuccess(res, 200, user);
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password +tokenVersion");

  if (!user.password) {
    throw ApiError.badRequest(
      "This account signs in with Google and has no password to change.",
      undefined,
      "NO_LOCAL_PASSWORD",
    );
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  notifyPasswordChanged(user);
  openSession(res, user, "Password updated successfully");
});

const deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    active: false,
    $inc: { tokenVersion: 1 },
  });
  closeSession(res);
  res.status(200).json({ success: true, message: "Account deactivated" });
});


const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save at most ${MAX_ADDRESSES} addresses`);
  }

  if (req.body.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  const { label, address, city, postalCode, country, isDefault } = req.body;
  user.addresses.push({ label, address, city, postalCode, country, isDefault });
  await user.save();

  sendSuccess(res, 201, user.addresses);
});

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound("Address not found");

  address.deleteOne();
  await user.save();

  sendSuccess(res, 200, user.addresses);
});


const getAllUsers = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(User.find(), req.query, {
    allowedFields: ["role", "active", "emailVerified", "authProvider"],
  })
    .filter()
    .search(["fullName", "email"])
    .sort()
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(User));
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  sendSuccess(res, 200, user);
});

const updateUser = asyncHandler(async (req, res) => {
  const { role, active, fullName } = req.body;

  if (role !== undefined && role !== "admin") {
    assertNotSelf(req.params.id, req.user, "You cannot remove your own admin role");
  }
  if (active === false) {
    assertNotSelf(req.params.id, req.user, "You cannot deactivate your own admin account");
  }

  const updates = {};
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;
  if (fullName !== undefined) updates.fullName = fullName;
  if (active === false || (role !== undefined && role !== "admin")) {
    updates.$inc = { tokenVersion: 1 };
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!user) throw ApiError.notFound("User not found");

  sendSuccess(res, 200, user);
});

const deleteUser = asyncHandler(async (req, res) => {
  assertNotSelf(req.params.id, req.user, "You cannot delete your own admin account");

  const user = await User.findByIdAndUpdate(req.params.id, {
    active: false,
    $inc: { tokenVersion: 1 },
  });
  if (!user) throw ApiError.notFound("User not found");

  res.status(200).json({ success: true, message: "User deactivated" });
});

module.exports = {
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
  addAddress,
  deleteAddress,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
