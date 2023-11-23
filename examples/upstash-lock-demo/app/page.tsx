'use client'

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type RequestResult = {
  id: number;
  result: string;
  leaseTime: number;
  lockKey: string;
};

export default function Home() {
  const [leaseTime, setLeaseTime] = useState<number>(10000);
  const [customId, setCustomId] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [requests, setRequests] = useState<RequestResult[]>([]);

  const acquireLock = async () => {
    if (countdown === null) {
      setRequests([]);
    }
    // Construct the URL with a conditional customId parameter
    let url = `/api/acquire-lock?leaseTime=${leaseTime}`;
    if (customId.trim() !== '') {
      url += `&customId=${encodeURIComponent(customId)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      toast.error(res.statusText);
      return;
    }

    const data = await res.json();

    setRequests(prevRequests => [
      ...prevRequests,
      { id: prevRequests.length + 1, result: data.message, leaseTime: data.leaseTime, lockKey: data.lockKey }
    ]);

    if (data.lockAcquired) {
      setCountdown(data.leaseTime);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (countdown !== null) {
      interval = setInterval(() => {
        setCountdown((currentCountdown) => {
          if (currentCountdown !== null && currentCountdown <= 0) {
            clearInterval(interval!);
            return null;
          }
          return currentCountdown !== null ? currentCountdown - 1000 : null;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);

  return (
    <main className="p-4 bg-white w-full h-full">
      <div className="w-full h-full">
        <h1 className="text-xl md:text-3xl font-bold text-center mb-6">Upstash Lock Demo</h1>
        <p className="text-center mb-6">
          This demo shows how Upstash Lock enforces mutual exclusion: only one user can hold the lock with the same ID at any given time.
        </p>

        <div className="text-center">
          <a href="https://github.com/upstash/lock" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-2">
            <img src="github-mark.png" alt="GitHub" className="mr-1 h-4 w-4" />
            Lock Library
          </a>
          |
          <a href="https://github.com/upstash/upstash-lock-demo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-2">
            <img src="github-mark.png" alt="GitHub" className="mr-1 h-4 w-4" />
            Demo
          </a>
        </div>

        <div className="mb-4">
          <label htmlFor="customId" className="block text-sm font-medium text-gray-700 mb-2">
            Lock ID (optional)
          </label>
          <p className="text-sm text-gray-500 mb-2">
            If you would like to try to acquire a lock on different devices, you can enter a custom lock ID here.
            If you leave this field empty, the lock ID will be your hashed IP Address.
          </p>
          <input
            id="customId"
            type="text"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="Enter custom lock ID here"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00E9A3] focus:border-[#00E9A3]"
          />
        </div>

        <div className="mb-8">
          <label htmlFor="lease-slider" className="block text-sm font-medium text-gray-700 mb-2">
            Lease Time (ms): <span className="font-semibold text-gray-900">{leaseTime}</span>
          </label>
          <input
            id="lease-slider"
            type="range"
            min="1000"
            max="20000"
            value={leaseTime}
            onChange={(e) => setLeaseTime(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"
          />
        </div>

        <button
          onClick={acquireLock}
          className="w-full px-4 py-2 bg-[#00E9A3] hover:bg-[#02c48a] text-white font-semibold rounded-md shadow-lg transition duration-300"
        >
          Acquire Lock
        </button>

        {countdown !== null && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md shadow text-center">
            Lease expires in <strong>{Math.max(0, Math.floor(countdown / 1000))}</strong> seconds
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Request Results</h3>
          <div className="grid grid-cols-3 gap-4 font-medium">
            <div>Request ID</div>
            <div>Lock Key (Hashed)</div>
            <div>Result</div>
          </div>
          <hr className="my-4" />
          <ul className="divide-y divide-gray-300">
            {requests.map((request) => (
              <li key={request.id} className="py-3 grid grid-cols-3 gap-4 items-center">
                <span className="font-medium">{request.id}</span>
                <span className="font-medium">
                  {request.lockKey.slice(0, 4)}...{request.lockKey.slice(-4)}
                </span>
                <span className={`font-medium ${request.result.includes("acquired") ? "text-green-600" : "text-red-600"}`}>
                  {request.result}
                </span>
              </li>
            ))}
          </ul>
        </div>


      </div>
    </main >
  );
}
