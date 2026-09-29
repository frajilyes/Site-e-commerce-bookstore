const {
  signAccessToken,
  signRefreshToken,
  refreshCookieOptions,
} = require("./jwt");

const REFRESH_COOKIE = "refreshToken";

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  emailVerified: Boolean(user.emailVerified),
});

const generateAuthTokens = (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user),
});

const buildAuthPayload = (user) => ({
  user: publicUser(user),
  accessToken: signAccessToken(user),
});

const openSession = (res, user, message) =>
  res
    .cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions())
    .status(200)
    .json({ success: true, message, data: buildAuthPayload(user) });

const closeSession = (res) =>
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: 0 });

module.exports = {
  REFRESH_COOKIE,
  publicUser,
  generateAuthTokens,
  buildAuthPayload,
  openSession,
  closeSession,
};
