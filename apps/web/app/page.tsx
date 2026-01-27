export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Pocket Room</h1>
      <p className="mb-8 text-xl">A shared space to think, remember, and build.</p>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button className="bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition">
          Continue with Google
        </button>
        
        <div className="flex gap-2">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="flex-1 p-4 rounded-lg border border-gray-300"
          />
          <button className="bg-blue-600 text-white p-4 rounded-lg font-bold hover:bg-blue-700 transition">
            Send OTP
          </button>
        </div>
      </div>
    </main>
  );
}
