'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

const videos = [
  {
    id: 'I490ebRtWEc',
    title: 'USA Pawn Holdings - TV Commercial',
    description: 'Check out our TV commercial featuring USA Pawn Holdings and what we can do for you.',
  },
  {
    id: 'omedUEeHSS4',
    title: 'USA Pawn Holdings - Store Showcase',
    description: 'Take a tour of our store and see the quality merchandise we have available.',
  },
];

export default function MediaPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden sm:py-20 bg-gradient-to-b from-vault-black-deep via-vault-black to-vault-surface/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-vault-red/5 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-4xl px-4 mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge 
              variant="outline" 
              className="px-4 py-1.5 text-sm font-mono font-semibold tracking-[0.2em] text-black dark:text-white bg-vault-red/10 border-vault-red/40 rounded-md uppercase mb-6"
            >
              Media Center
            </Badge>
            
            <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl font-display text-vault-text-light">
              {/* <span className="text-vault-red">Videos</span> */}
            </h1>
            
            <p className="max-w-2xl mx-auto mt-6 text-lg font-semibold text-left text-vault-text-muted">
              See what makes USA Pawn Holdings Jacksonville&apos;s premier pawn shop. From TV commercials to store tours, 
              discover why we&apos;re trusted by thousands.
            </p>
          </motion.div>
        </div>
      </section>

      <Separator className="bg-vault-border-accent" />

      {/* Videos Grid */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl px-4 mx-auto">
          <div className="grid grid-cols-1 gap-8 lg:gap-12">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <Card className="overflow-hidden transition-all duration-300 border-2 shadow-2xl bg-vault-surface border-vault-border hover:border-vault-red/40 group">
                  <CardContent className="p-0">
                    {/* Video Container */}
                    <div className="relative w-full overflow-hidden bg-vault-black aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                      />
                    </div>
                    
                    {/* Video Info */}
                    <div className="p-6 sm:p-8">
                      <h2 className="text-2xl font-bold transition-colors duration-200 sm:text-3xl font-display text-vault-text-light group-hover:text-vault-red">
                        {video.title}
                      </h2>
                      <p className="mt-3 text-vault-text-muted">
                        {video.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-vault-surface/50">
        <div className="max-w-4xl px-4 mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl font-display text-vault-text-light">
              Ready to <span className="text-vault-red">Visit</span> Us?
            </h2>
            
            <p className="max-w-xl mx-auto mt-4 text-vault-text-muted">
              Come see us in person at 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
            </p>

            <div className="flex flex-col items-center justify-center gap-4 mt-8 sm:flex-row">
              <Link
                href="/appraise"
                className="group relative inline-flex items-center gap-2 px-8 py-4 h-auto rounded-lg font-semibold text-white red-gradient border border-vault-red-hover/60 shadow-lg shadow-vault-red/20 hover:shadow-vault-red/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="text-lg">📸</span>
                Get AI Appraisal
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
              
              <a
                href="tel:+19046417296"
                className="inline-flex items-center gap-2 px-8 py-4 font-semibold transition-all duration-300 border-2 rounded-lg text-vault-text-light border-vault-border bg-vault-surface/40 hover:border-vault-red hover:bg-vault-surface-elevated/50"
              >
                📞 (904) 641-7296
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-sm text-vault-text-muted">📍</span>
              <a 
                href="https://maps.google.com/?q=6132+Merrill+Rd+Ste+1+Jacksonville+FL+32277"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm transition-colors text-vault-text-muted hover:text-vault-red"
              >
                Get Directions
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
