import React, { useEffect } from 'react';
import { useTeamChat, Channel } from '../../contexts/TeamChatContext';

const ChannelsList: React.FC = () => {
  const { channels, activeChannel, setActiveChannel, fetchChannels, loadingChannels } = useTeamChat();

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel);
  };

  if (loadingChannels) {
    return (
      <div className="p-4">
        <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 text-gray-300 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Channels</h2>
      </div>
      <ul className="p-2">
        {channels.map((channel) => (
          <li 
            key={channel.id}
            onClick={() => handleChannelClick(channel)}
            className={`p-2 rounded cursor-pointer hover:bg-gray-700 ${
              activeChannel?.id === channel.id ? 'bg-gray-700 font-medium' : ''
            }`}
          >
            # {channel.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelsList;