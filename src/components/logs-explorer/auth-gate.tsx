"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthGateProps = {
  onSubmit: (key: string) => void;
};

export function AuthGate({ onSubmit }: AuthGateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Slogger Explorer</CardTitle>
          <CardDescription>Enter your API key to query logs.</CardDescription>
        </CardHeader>
        <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const value = String(formData.get("apiKey") ?? "").trim();
            if (value) {
              onSubmit(value);
            }
          }}
        >
          <Input type="password" name="apiKey" placeholder="sk_live_..." autoComplete="off" />
          <Button className="w-full" type="submit">
            Continue
          </Button>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}
