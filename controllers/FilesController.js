import { ObjectId } from 'mongodb';
import Queue from 'bull';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import basicUtils from '../utils/basic';

const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const { userId } = await userUtils.getUserIdAndKeys(req);

    if (!basicUtils.isValidId(userId)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!userId && req.body.type === 'image') {
      await fileQueue.add({});
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { error: validationError, fileParams } = await fileUtils.validateBody(req);

    if (validationError) {
      return res.status(400).send({ error: validationError });
    }

    if (fileParams.parentId !== 0 && !basicUtils.isValidId(fileParams.parentId)) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      folderPath,
    );

    if (error) {
      if (res.body.type === 'image') {
        await fileQueue.add({ userId });
      }
      return res.status(code).send(error);
    }

    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }
    return res.status(201).send(newFile);
  }
}

export default FilesController;
