import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  IconSword,
  IconBrain,
  IconMicrophone,
  IconUsers,
  IconCards,
  IconChartBar,
  IconArrowRight,
} from '@tabler/icons-react';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DM HUD",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web",
  "description": "Real-time AI-powered dashboard for Dungeon Masters. Automatically tracks characters, locations, items, and plot threads during D&D sessions.",
  "url": "https://dmhud.com",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free during beta"
  },
  "featureList": [
    "Live session transcription",
    "AI entity extraction",
    "Character and NPC tracking",
    "Combat and exploration modes",
    "AI-generated session reports",
    "Campaign management"
  ]
};

export default function Landing() {
  const { user, loading } = useAuth();

  // If logged in, show a quick redirect link at top
  const isLoggedIn = !loading && user;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Nav */}
      <nav className="border-b border-gray-800/50 backdrop-blur-md bg-gray-950/80 sticky top-0 z-30" aria-label="Main navigation">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <IconSword size={18} className="text-indigo-400" />
            </div>
            <span className="font-bold text-white text-lg">DM HUD</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                to="/app"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Open App <IconArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Try for Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400 font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Now in Beta
        </div>
        <h1 id="hero-heading" className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Real-Time Intelligence
          </span>
          <br />
          <span className="text-white">for Dungeon Masters</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          DM HUD listens to your session, tracks characters, locations, and plot threads automatically,
          and gives you AI-powered tools to run better games — all in real time.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to={isLoggedIn ? '/app' : '/login?mode=signup'}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            {isLoggedIn ? 'Open App' : 'Get Started Free'} <IconArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="px-6 py-3 bg-gray-800/50 hover:bg-gray-800 text-gray-300 font-medium rounded-xl transition-colors text-sm border border-gray-700/50"
          >
            See How It Works
          </a>
        </div>

        {/* Hero image */}
        <div className="mt-16 relative">
          <div className="absolute -inset-4 bg-gradient-to-b from-indigo-600/20 via-transparent to-transparent rounded-3xl blur-2xl" />
          <img
            src="/images/og-hero.jpg"
            alt="A Dungeon Master's table with character sheets, a DM screen, dice, and a hand-drawn dungeon map"
            className="relative w-full rounded-2xl border border-gray-800 shadow-2xl shadow-indigo-950/50"
          />
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-5xl mx-auto px-6 py-16" aria-labelledby="problem-heading">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 md:p-12">
          <h2 id="problem-heading" className="text-2xl font-bold text-white mb-4">The Problem Every DM Knows</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="space-y-2">
              <div className="text-3xl">📝</div>
              <h3 className="font-semibold text-white">Too Much to Track</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                NPCs, locations, plot threads, HP, conditions — juggling it all while improvising pulls you out of the story.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">🎭</div>
              <h3 className="font-semibold text-white">Notes Kill Momentum</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Stopping to write things down breaks the flow. But skip the notes and you'll forget what happened by next session.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">🔮</div>
              <h3 className="font-semibold text-white">Prep Takes Forever</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Writing session recaps, generating NPC backstories, fleshing out locations — the creative work outside the game adds up fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dice divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <img
            src="/images/dice-banner.jpg"
            alt="Colorful polyhedral dice scattered across a wooden table"
            className="w-full object-cover opacity-60"
            style={{ maxHeight: '160px' }}
          />
        </div>
      </div>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16" aria-labelledby="features-heading">
        <div className="text-center mb-12">
          <h2 id="features-heading" className="text-3xl font-bold text-white mb-3">Your AI Co-Pilot at the Table</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            DM HUD runs alongside your session, doing the busywork so you can focus on what matters — telling a great story.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<IconMicrophone size={24} />}
            color="indigo"
            title="Live Transcription"
            description="Plug in a mic and DM HUD transcribes your session in real time using Deepgram. Every word captured, every NPC name logged."
          />
          <FeatureCard
            icon={<IconBrain size={24} />}
            color="purple"
            title="AI Entity Extraction"
            description="As your session unfolds, AI identifies new characters, locations, items, and plot points — creating trackable cards automatically."
          />
          <FeatureCard
            icon={<IconCards size={24} />}
            color="emerald"
            title="Smart Card System"
            description="Every entity gets a card with notes, canon facts, AI-generated riffs, HP tracking, conditions, and more. Exploration and combat modes built in."
          />
          <FeatureCard
            icon={<IconUsers size={24} />}
            color="amber"
            title="Player Roster & Context"
            description="Map players to characters with aliases so the AI knows who's who. Set your campaign arc to guide extraction."
          />
          <FeatureCard
            icon={<IconChartBar size={24} />}
            color="pink"
            title="Session Reports"
            description="Generate polished session recaps with one click — complete with highlights, player moments, and story beats."
          />
          <FeatureCard
            icon={<IconSword size={24} />}
            color="red"
            title="Combat & Exploration"
            description="Switch between exploration and combat modes. Track initiative, HP, conditions, and hostile status across encounters."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20" aria-labelledby="cta-heading">
        <div className="text-center bg-gradient-to-b from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-2xl p-12">
          <h2 id="cta-heading" className="text-3xl font-bold text-white mb-3">Ready to Level Up Your Sessions?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            DM HUD is free during beta. Create an account and start running smarter games today.
          </p>
          <Link
            to={isLoggedIn ? '/app' : '/login?mode=signup'}
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            {isLoggedIn ? 'Open App' : 'Try for Free'} <IconArrowRight size={18} />
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <IconSword size={14} />
            <span>DM HUD</span>
          </div>
          <p className="text-gray-600 text-xs">Real-time D&D session intelligence, powered by AI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, color, title, description }) {
  const colors = {
    indigo: 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20',
    purple: 'bg-purple-600/10 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-600/10 text-amber-400 border-amber-500/20',
    pink: 'bg-pink-600/10 text-pink-400 border-pink-500/20',
    red: 'bg-red-600/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
