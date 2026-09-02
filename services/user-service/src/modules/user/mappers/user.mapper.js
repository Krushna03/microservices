export const toUserResponse = (user) => {
  if (!user) return null;
  return {
    id: user._id ? user._id.toString() : user.id || user.userId,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};