import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import dbClient from './db';
import basicUtils from './basic';

const fileUtils = {
  async validateBody(req) {
    const {
      name, type, isPublic = false, data,
    } = req.body;
    let { parentId = 0 } = req.body;
    const typesAllowed = ['file', 'image', 'folder'];
    let message = null;

    if (parentId === '0') {
      parentId = 0;
    }

    if (!name) {
      message = 'Missing name';
    } else if (!type || !typesAllowed.includes(type)) {
      message = 'Missing type';
    } else if (!data && type !== 'folder') {
      message = 'Missing data';
    } else if (parentId && parentId !== '0') {
      let file;

      if (basicUtils.isValidId(parentId)) {
        file = await this.getFile({ _id: ObjectId(parentId) });
      } else {
        file = null;
      }

      if (!file) {
        message = 'Parent not found';
      } else if (file.type !== 'folder') {
        message = 'Parent is not a folder';
      }
    }

    const result = {
      error: message,
      fileParams: {
        name, type, parentId, isPublic, data,
      },
    };
    return result;
  },

  async saveFile(userId, fileParams, folderPath) {
    const {
      name, type, isPublic, data,
    } = fileParams;
    let { parentId } = fileParams;

    if (parentId !== 0) {
      parentId = ObjectId(parentId);
    }

    const query = {
      userId: ObjectId(userId), name, type, isPublic, parentId,
    };

    if (fileParams.type !== 'folder') {
      const fileUUID = uuidv4();
      const dataDecoded = Buffer.from(data, 'base64');
      const path = `${folderPath}/${fileUUID}`;

      query.localPath = path;

      try {
        await fsPromises.mkdir(folderPath, { recursive: true });
        await fsPromises.writeFile(path, dataDecoded);
      } catch (err) {
        return { error: err.message, code: 400 };
      }
    }

    const collection = await dbClient.filesCollection();
    const result = await collection.insertOne(query);
    const file = this.processFile(query);
    const newFile = { id: result.insertedId, ...file };

    return { error: null, newFile };
  },

  processFile(query) {
    const file = { id: query._id, ...query };

    delete file.localPath;
    delete file._id;
    return file;
  },

  async getFile(query) {
    const collection = await dbClient.filesCollection();
    const file = await collection.findOne(query);
    return file;
  },

  async getFilesOfParentId(query) {
    const collection = await dbClient.filesCollection();
    return collection.aggregate(query);
  },
};

export default fileUtils;
