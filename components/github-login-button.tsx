'use client'
import { Github } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function GithubLoginButton() {

    const supabase = createClient();
    const signInWithGithub = async () => {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          
          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error signing in with GitHub:', error);
        }
      };
  return (
    <button
      onClick={signInWithGithub}
      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
    >
      <Github className="text-xl" />
      <span>Continue with GitHub</span>
    </button>
  );
}