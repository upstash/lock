export const RELEASE_SCRIPT = `
-- Check if the current UUID still holds the lock
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

export const EXTEND_SCRIPT = `
-- Check if the current UUID still holds the lock
if redis.call("get", KEYS[1]) ~= ARGV[1] then
	return 0
end

-- Get the current TTL and extend it by the specified amount
local ttl = redis.call("ttl", KEYS[1])
if ttl > 0 then
	return redis.call("expire", KEYS[1], ttl + ARGV[2])
else
	return 0
end
`;
