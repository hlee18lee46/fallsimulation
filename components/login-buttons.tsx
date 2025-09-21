"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LoginButtonsProps {
  size?: "default" | "sm" | "lg";
}

export function LoginButtons({ size = "default" }: LoginButtonsProps) {
  const handleLogin = () => {
    const qs = new URLSearchParams({ returnTo: "/issue" });
    window.location.href = `/api/auth/login?${qs.toString()}`; // v3 endpoint
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleLogin} size={size} className="bg-primary hover:bg-primary/90">
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Log in
        <Badge variant="secondary" className="ml-2 text-xs">PawProof</Badge>
      </Button>
    </div>
  );
}
