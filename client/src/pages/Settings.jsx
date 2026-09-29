import { UserProfile } from '@clerk/clerk-react';

export default function Settings() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="overflow-x-auto"><UserProfile routing="hash" /></div>
    </div>
  );
}
