import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.connect = true;
    this.client.on('error', (err) => {
      this.connect = false;
      console.log(err);
    });
  }

  isAlive() {
    return this.connect;
  }

  async get(key) {
    return promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, value, duration) {
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.del).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
