import { expect, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { DistributedDebounce } from "./debounce";

function getUniqueFunctionId() {
  return `debounce-test-${Math.random().toString(36).substr(2, 9)}`;
}

test("Debounced function is only called once per wait time", async () => {
  
  // Initialize a counter
  // We will use this to check how many times the debounced function is called
  let count = 0;

  const uniqueId = getUniqueFunctionId();
  const debouncedFunction = new DistributedDebounce({
    id: uniqueId,
    redis: Redis.fromEnv(),

    // Wait time of 1 second
    // The debounced function will only be called once per second
    wait: 1000,
    
    // Callback function to be debounced
    callback: () => {
      // Increment the counter
      count++;
    },
  });

  for (let i = 0; i < 10; i++) {
    debouncedFunction.call();
  }

  // Wait 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // The debounced function should only be called once
  expect(count).toBe(1);
});


test("Debounced function with arguments is called correctly", async () => {
  let coolWord = "";

  const uniqueId = getUniqueFunctionId();
  const debouncedFunction = new DistributedDebounce({
    id: uniqueId,
    redis: Redis.fromEnv(),
    wait: 1000,
    callback: (word: string) => {
      coolWord = word;
    },
  });

  const words = ["Upstash", "Is", "A", "Serverless", "Database", "Provider"];

  for (const word of words) {
    debouncedFunction.call(word);
  }

  // Wait 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Our coolWord should be one of the words we passed to the debounced function
  expect(words).toContain(coolWord);
});
