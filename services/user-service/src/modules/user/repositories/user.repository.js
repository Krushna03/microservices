import User from "../models/user.model.js";


// NOTE : Repository returns data, not Mongoose-specific documents.

// .lean() - returns a plain object.
export const findByEmail = async (email) => {
  return User.findOne({ email }).lean();
};

// +password - returns the password for verification
export const findByEmailWithPassword = async (email) => {
  return User.findOne({ email })
    .select("+password")
    .lean();
};

// toObject() - returns a plain object from a Mongoose document.
export const create = async (userData) => {
  const user = await User.create(userData);

  return user.toObject();
};


export const findById = async (userId) => {
  return User.findById(userId).lean();
};

