"use client";
import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import Image from "next/image";

const GLOW_COLORS = ["red", "white", "blue"] as const;
type GlowColor = (typeof GLOW_COLORS)[number];

const GLOW_STYLES: Record<GlowColor, { shadow: string; ring: string; ringSoft: string }> = {
  red: {
    shadow: "0 0 22px rgba(230,0,0,0.75), 0 0 50px rgba(204,0,0,0.5), 0 10px 34px rgba(0,0,0,0.55)",
    ring: "rgba(230,0,0,0.95)",
    ringSoft: "rgba(204,0,0,0.55)",
  },
  white: {
    shadow: "0 0 18px rgba(255,255,255,0.9), 0 0 42px rgba(220,232,255,0.55), 0 10px 34px rgba(0,0,0,0.55)",
    ring: "rgba(255,255,255,0.98)",
    ringSoft: "rgba(200,220,255,0.52)",
  },
  blue: {
    shadow: "0 0 22px rgba(74,144,217,0.85), 0 0 50px rgba(91,160,232,0.55), 0 10px 34px rgba(0,0,0,0.55)",
    ring: "rgba(91,160,232,0.95)",
    ringSoft: "rgba(74,144,217,0.58)",
  },
};

function randomGlowColor(): GlowColor {
  return GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)];
}

const ImageModal = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  imageTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  imageSrc: string; 
  imageTitle: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] text-white hover:text-vault-red transition-colors"
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full p-4">
        <Image
          src={imageSrc}
          alt={imageTitle}
          fill
          className="object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <p className="absolute text-lg font-semibold text-white bottom-8">{imageTitle}</p>
    </div>
  );
};

export const HeroParallax = ({
  products,
  title = "USA Pawn Holdings",
  description = "Jacksonville's trusted pawn shop since day one. Fast cash, fair prices, no hassle. From gold and jewelry to electronics and tools — we've got you covered.",
  showBadge = true,
  badge = "Jacksonville's Premier Pawn Shop"
}: {
  products: {
    title: string;
    link: string;
    thumbnail: string;
  }[];
  title?: string;
  description?: string;
  showBadge?: boolean;
  badge?: string;
}) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 750]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -750]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.45, 0.82]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-300, 150]),
    springConfig
  );
  const [glowAssignments, setGlowAssignments] = React.useState<GlowColor[]>(() =>
    products.map((_, index) => GLOW_COLORS[index % GLOW_COLORS.length])
  );

  React.useEffect(() => {
    setGlowAssignments(products.map((_, index) => GLOW_COLORS[index % GLOW_COLORS.length]));

    const intervalId = window.setInterval(() => {
      setGlowAssignments(products.map(() => randomGlowColor()));
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [products]);

  return (
    <div
      ref={ref}
      className="h-[160vh] md:h-[240vh] py-20 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      {/* Static textured background - grayscale logo symbol */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/logo-symbol.png)',
          backgroundSize: '280px 280px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          filter: 'grayscale(100%) opacity(0.08) blur(0.5px)',
          backgroundAttachment: 'fixed',
        }}
      />
      
      {/* Overlay - light for light mode, dark blue for dark mode */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#d6e8ff]/35 via-[#e6f1ff]/45 to-[#d6e8ff]/35 dark:from-[#0B1426]/70 dark:via-[#0B1426]/75 dark:to-[#0B1426]/70" />

      <Header 
        title={title} 
        description={description}
        showBadge={showBadge}
        badge={badge}
      />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className="relative z-[2]"
      >
        <motion.div className="flex flex-row-reverse mb-10 space-x-5 space-x-reverse md:space-x-20? md:mb-20">
          {firstRow.map((product, idx) => (
            <div key={`first-${idx}`}>
                <ProductCard
                  product={product}
                  translate={translateX}
                  glowColor={glowAssignments[idx] ?? GLOW_COLORS[idx % GLOW_COLORS.length]}
                />
            </div>
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-10 space-x-5 md:mb-20 md:space-x-20? ">
          {secondRow.map((product, idx) => (
            <div key={`second-${idx}`}>
              <ProductCard
                product={product}
                translate={translateXReverse}
                glowColor={glowAssignments[firstRow.length + idx] ?? GLOW_COLORS[(firstRow.length + idx) % GLOW_COLORS.length]}
                key={`second-${idx}`}
              />
            </div>
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-5 space-x-reverse md:space-x-20?">
          {thirdRow.map((product, idx) => (
            <div key={`third-${idx}`}>
                <ProductCard
                  product={product}
                  translate={translateX}
                  glowColor={glowAssignments[firstRow.length + secondRow.length + idx] ?? GLOW_COLORS[(firstRow.length + secondRow.length + idx) % GLOW_COLORS.length]}
                />
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = ({ 
  title = "USA Pawn Holdings",
  description = "Jacksonville's trusted pawn shop since day one. Fast cash, fair prices, no hassle. From gold and jewelry to electronics and tools — we've got you covered.",
  showBadge = true,
  badge = "Jacksonville's Premier Pawn Shop"
}: {
  title?: string;
  description?: string;
  showBadge?: boolean;
  badge?: string;
}) => {
  return (
    <div className="relative top-0 left-0 z-10 w-full px-4 py-12 mx-auto max-w-7xl md:py-20">
      <div className="flex flex-col items-center justify-center">
        {/* Badge */}
        {showBadge && (
          <div className="mb-6">
            <div className="px-4 py-1.5 text-xs font-mono font-semibold tracking-[0.2em] text-white border-2 border-[#CC0000] rounded-md uppercase bg-[#CC0000] shadow-lg inline-block">
              {badge}
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <h1 className="sr-only">{title}</h1>
          <Image
            src="/logo.PNG"
            alt="USA Pawn Holdings Logo"
            width={600}
            height={200}
            priority
            className="max-w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
            style={{ maxWidth: '90%', height: 'auto' }}
          />
        </div>

        <div className="grain-white w-full max-w-3xl px-4 py-5 mt-1 border rounded-2xl bg-white/76 dark:bg-[#0B1426]/58 border-vault-gold/35 backdrop-blur-[2px] shadow-[0_12px_36px_rgba(10,22,40,0.22)]">
          {/* Decorative lines with tagline */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="w-12 h-px bg-[#CC0000] shadow-sm" />
            <span className="font-mono text-xs md:text-sm uppercase tracking-[0.18em] text-gray-700 dark:text-white font-bold drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              No Pressure • Free Appraisals
            </span>
            <span className="w-12 h-px bg-[#CC0000] shadow-sm" />
          </div>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-center text-2xl md:text-4xl leading-tight text-gray-800 dark:text-white font-black drop-shadow-[0_3px_12px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            {description}
          </p>

          {/* Address */}
          <p className="mt-4 font-mono text-base text-center text-gray-700 dark:text-vault-text-light font-semibold drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            📍 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
          </p>
        </div>
      </div>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
  glowColor,
}: {
  product: {
    title: string;
    link: string;
    thumbnail: string;
  };
  translate: MotionValue<number>;
  glowColor: GlowColor;
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const glowStyle = GLOW_STYLES[glowColor];

  return (
    <>
      <motion.div
        style={{
          x: translate,
          boxShadow: glowStyle.shadow,
        }}
        whileHover={{
          y: -20,
        }}
        key={product.title}
        className="group/product h-64 md:h-96 w-[20rem] md:w-[30rem] relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 border-vault-gold/85 dark:border-white/10 mr-10 md:mr-20"
        onClick={() => setIsModalOpen(true)}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-[1px] z-[1] rounded-lg"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${glowStyle.ring} 72deg, transparent 144deg, ${glowStyle.ringSoft} 216deg, transparent 320deg)`,
            mixBlendMode: "screen",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 z-[1] rounded-xl blur-xl"
          style={{ background: `radial-gradient(circle at center, ${glowStyle.ringSoft} 0%, transparent 72%)` }}
        />
        <Image
          src={product.thumbnail}
          fill
          sizes="(max-width: 768px) 20rem, 30rem"
          className="relative z-[2] object-cover object-center"
          alt={product.title}
        />
        <div className="absolute inset-0 z-[3] w-full h-full transition-opacity bg-black rounded-lg opacity-0 pointer-events-none group-hover/product:opacity-80"></div>
        <h2 className="absolute z-[4] font-semibold text-white opacity-0 bottom-4 left-4 group-hover/product:opacity-100">
          {product.title}
        </h2>
      </motion.div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageSrc={product.thumbnail}
        imageTitle={product.title}
      />
    </>
  );
};
