import { Navbar } from '@/components/Navbar'

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to Appointer
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            This is a public page that anyone can see. Sign up or log in to access
            personalized features and start using our platform.
          </p>
        </div>
      </main>
    </>
  )
}
