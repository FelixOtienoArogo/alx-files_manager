import { redisClient } from './redis';
import dbClient from './db';

const userUtils = {
  async getUserIdAndKey(req) {
    const cred = { userId: null, key: null };
    const token = req.header('X-Token');

    if (!token) {
      return cred;
    }
    cred.key = `auth_${token}`;
    cred.userId = await redisClient.get(cred.key);
    return cred;
  },

  async getUser(query) {
    const collection = await dbClient.usersCollection();
    return collection.findOne(query);
  },
};

export default userUtils;
