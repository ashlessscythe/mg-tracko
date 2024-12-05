import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Clock, BarChart2, Users, Truck } from "lucide-react";

const APP_NAME = "MG Tracko";

const features = [
  {
    name: "Real-time Tracking",
    description:
      "Monitor expedite requests in real-time with instant status updates.",
    icon: Clock,
  },
  {
    name: "Analytics Dashboard",
    description:
      "Comprehensive analytics to track performance and identify trends.",
    icon: BarChart2,
  },
  {
    name: "Team Collaboration",
    description:
      "Seamless communication between customer service and warehouse teams.",
    icon: Users,
  },
  {
    name: "Efficient Processing",
    description: "Streamlined workflow for faster must-go shipment processing.",
    icon: Truck,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main>
        {/* Hero Section */}
        <div className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-48">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Must-Go Management{" "}
                <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 dark:from-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                  Simplified
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                Streamline your expedite request process with {APP_NAME}. Track,
                manage, and process must-go shipments efficiently in one place.
              </p>
              <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
                <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                  <Link
                    href="/signin"
                    className="flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:px-8"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-base font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:px-8"
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-background py-8 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Features
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Everything you need to manage expedite requests efficiently
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
              <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
                {features.map(({ name, description, icon: Icon }) => (
                  <div
                    key={name}
                    className="relative flex flex-col gap-6 border rounded-lg p-6"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold leading-7 text-foreground">
                        {name}
                      </h3>
                      <p className="mt-2 text-base leading-7 text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-background py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                About {APP_NAME}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Designed to revolutionize how companies handle their expedite
                requests. Our platform bridges the gap between customer service
                and warehouse teams.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-7xl sm:mt-20">
              <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
                <div className="relative flex flex-col gap-6 border rounded-lg p-8">
                  <h3 className="text-xl font-semibold leading-7 text-foreground">
                    For Customer Service
                  </h3>
                  <p className="text-base leading-7 text-muted-foreground">
                    Submit and track expedite requests with ease. Get real-time
                    updates on shipment status and maintain clear communication
                    with the warehouse team.
                  </p>
                </div>
                <div className="relative flex flex-col gap-6 border rounded-lg p-8">
                  <h3 className="text-xl font-semibold leading-7 text-foreground">
                    For Warehouse Staff
                  </h3>
                  <p className="text-base leading-7 text-muted-foreground">
                    Access a clear queue of requests, mark items as processed,
                    and maintain efficient workflow. Stay organized with our
                    intuitive interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
