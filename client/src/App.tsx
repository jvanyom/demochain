import { Outlet } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'framer-motion';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

export default function App() {
  const reduced = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
        <div className="flex min-h-full flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
