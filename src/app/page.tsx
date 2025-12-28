import { caller } from '@/trpc/server';
export default async function Home() {
  const greeting = await caller.helloo({ text: "John" });
    //  ^? { greeting: string }
  return <div>{greeting.greeting}</div>;
}