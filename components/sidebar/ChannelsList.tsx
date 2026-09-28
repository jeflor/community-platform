"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Channel } from "@/lib/actions/channels";

interface ChannelsListProps {
  channels: Channel[];
}

export function ChannelsList({ channels }: ChannelsListProps) {
  const pathname = usePathname();

  const chatChannels = channels.filter((c) => c.type === "chat");
  const threadChannels = channels.filter((c) => c.type === "thread");

  return (
    <div className="space-y-4">
      {chatChannels.length > 0 && (
        <div>
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Chat
          </h3>
          <div className="mt-2 space-y-1">
            {chatChannels.map((channel) => (
              <Link
                key={channel.id}
                href={`/chat/${channel.slug}`}
                className={`block px-4 py-2 rounded-lg transition ${
                  pathname === `/chat/${channel.slug}`
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="text-gray-400 mr-1">#</span>
                {channel.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {threadChannels.length > 0 && (
        <div>
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Threads
          </h3>
          <div className="mt-2 space-y-1">
            {threadChannels.map((channel) => (
              <Link
                key={channel.id}
                href={`/chat/${channel.slug}`}
                className={`block px-4 py-2 rounded-lg transition ${
                  pathname === `/chat/${channel.slug}`
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="text-gray-400 mr-1">💬</span>
                {channel.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {channels.length === 0 && (
        <p className="px-4 text-sm text-gray-400">No channels available</p>
      )}
    </div>
  );
}
