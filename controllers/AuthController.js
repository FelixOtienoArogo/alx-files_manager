import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../utils/redis';
import userUtils from '../utils/user';

class AuthController {
  static async getConnect(req, res) {
    const Authorization = req.header('Authorization') || '';
    const credentials = Authorization.split(' ')[1];
    const decodedCredentials = Buffer.from(credentials, 'base64').toString('utf-8');
    const [email, password] = decodedCredentials.split(':');

    if (!email || !password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const hashPass = sha1(password);
    const user = await userUtils.getUser({
      email,
      password: hashPass,
    });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    const exp = 24 * 3600;

    await redisClient.set(key, user._id.toString(), exp);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const { userId, key } = await userUtils.getUserIdAndKey(req);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    await redisClient.del(key);

    return res.status(204).send();
  }
}

export default AuthController;
