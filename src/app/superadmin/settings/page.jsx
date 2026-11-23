
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <SettingsForm />
      </div>
    </div>
  );
}
