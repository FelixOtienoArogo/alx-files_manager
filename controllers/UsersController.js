import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';

const userQueue = new Queue('userQueue');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }
    const collection = await dbClient.usersCollection();
    const dbEmail = await collection.findOne({ email });

    if (dbEmail) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const hashPass = sha1(password);

    let dbResult;
    try {
      dbResult = await collection.insertOne({
        email,
        password: hashPass,
      });
    } catch (err) {
      await userQueue.add({});
      return res.status(500).send({ error: 'Error creating user.' });
    }

    const user = {
      id: dbResult.insertedId,
      email,
    };

    await userQueue.add({
      userId: dbResult.insertedId.toString(),
    });

    return res.status(201).send(user);
  }
}

export default UsersController;
