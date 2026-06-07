import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <SignIn 
        appearance={{
          elements: {
            footerAction: "hidden",
          },
        }}
      />
    </div>
  );
}
