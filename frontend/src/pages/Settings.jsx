import React, { useEffect, useState } from 'react';
import { Bell, Database, KeyRound, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, PrimaryButton, SecondaryButton } from '../components/ui';

const SettingRow = ({ icon: Icon, title, description, children }) => (
  <div className="flex flex-col gap-4 border-b border-gray-200 py-5 last:border-b-0 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-950 dark:text-gray-50">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
    <div className="lg:min-w-56">{children}</div>
  </div>
);

const Settings = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem('tripSplitterNotifications') !== 'off'
  );
  const [compactMode, setCompactMode] = useState(
    () => localStorage.getItem('tripSplitterCompactMode') === 'on'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('tripSplitterNotifications', notifications ? 'on' : 'off');
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('tripSplitterCompactMode', compactMode ? 'on' : 'off');
  }, [compactMode]);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage account preferences and app configuration." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-950 dark:text-gray-50">{user?.name || 'User'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'No email available'}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-950 dark:text-gray-50">Signed in</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Authentication is handled with JWT. Logout clears the local token.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <SettingRow icon={darkMode ? Moon : Sun} title="Appearance" description="Switch the app between light and dark mode.">
            <SecondaryButton onClick={() => setDarkMode((prev) => !prev)} className="w-full">
              {darkMode ? 'Use Light Mode' : 'Use Dark Mode'}
            </SecondaryButton>
          </SettingRow>

          <SettingRow icon={Bell} title="Notifications" description="Save your local preference for reminders and chat/activity notifications.">
            <label className="flex cursor-pointer items-center justify-end gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(event) => setNotifications(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Enabled
            </label>
          </SettingRow>

          <SettingRow icon={Database} title="Layout Density" description="Store a local preference for compact screens. Future pages can consume this setting.">
            <label className="flex cursor-pointer items-center justify-end gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(event) => setCompactMode(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Compact
            </label>
          </SettingRow>

          <SettingRow icon={KeyRound} title="API Keys" description="Google Places and Gemini keys are configured server-side in backend/.env. They are never entered in the browser.">
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Server managed
            </div>
          </SettingRow>

          <SettingRow icon={ShieldCheck} title="Security" description="Password reset, profile editing, and account deletion require backend endpoints and are marked as future tasks.">
            <PrimaryButton disabled className="w-full opacity-70">
              Coming Soon
            </PrimaryButton>
          </SettingRow>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
