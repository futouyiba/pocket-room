export default function RoomsPage() {
  const rooms = [
    { id: '1', name: 'Product Design', activeUsers: 3, description: 'Discussing the new UX flow.' },
    { id: '2', name: 'Engineering Sync', activeUsers: 5, description: 'Weekly sync for the dev team.' },
    { id: '3', name: 'Random Ideas', activeUsers: 1, description: 'A place for random thoughts.' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Public Rooms</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <a key={room.id} href={`/rooms/${room.id}`} className="block p-6 border rounded-lg hover:bg-gray-50 transition">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold">{room.name}</h2>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{room.activeUsers} active</span>
            </div>
            <p className="text-gray-600">{room.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
