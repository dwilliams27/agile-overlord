import React, { useEffect } from 'react';
import { useFoolsForum, Channel } from '../../contexts/FoolsForumContext';

const ChannelsList: React.FC = () => {
  const { channels, activeChannel, setActiveChannel, fetchChannels, loadingChannels } = useFoolsForum();

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
    <div className="bg-green-900 text-yellow-100 h-full overflow-y-auto">
      <div className="p-4 border-b border-green-700">
        <h2 className="text-lg font-semibold">Channels</h2>
      </div>
      <ul className="p-2">
        {channels.map((channel) => (
          <li 
            key={channel.id}
            onClick={() => handleChannelClick(channel)}
            className={`p-2 rounded cursor-pointer hover:bg-green-700 ${
              activeChannel?.id === channel.id ? 'bg-red-800 font-medium' : ''
            }`}
          >
            🎪 {channel.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelsList;