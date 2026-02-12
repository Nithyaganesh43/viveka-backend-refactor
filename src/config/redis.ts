export interface RedisClientLike {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

let redisClient: RedisClientLike | null = null;

export const initRedis = async (client?: RedisClientLike): Promise<void> => {
  redisClient = client ?? null;
  if (redisClient) {
    await redisClient.connect();
  }
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.disconnect();
  }
};
