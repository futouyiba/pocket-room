export default function RoomPage({ params }: { params: { id: string } }) {
  // Mock messages
  const messages = [
    { id: '1', sender: 'Alice', content: 'Hey everyone, welcome to the room!', timestamp: '10:00 AM' },
    { id: '2', sender: 'Bob', content: 'Hi Alice! Excited to be here.', timestamp: '10:01 AM' },
    { id: '3', sender: 'Charlie', content: 'Is this the spectator view?', timestamp: '10:02 AM' },
  ];

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center bg-white">
        <h1 className="text-xl font-bold">Room #{params.id}</h1>
        <div className="text-sm text-gray-500">Spectator Mode (Read Only)</div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-bold">{msg.sender}</span>
              <span className="text-xs text-gray-400">{msg.timestamp}</span>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm max-w-lg mt-1">
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t bg-gray-100 text-center text-gray-500 text-sm">
        You are spectating. <a href="/login" className="underline text-blue-600">Join</a> to participate.
      </div>
    </div>
  );
}
