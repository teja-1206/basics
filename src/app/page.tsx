'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Bookmark, 
  Sparkles, 
  Shield, 
  Zap, 
  Globe, 
  Lock, 
  ArrowRight,
  Star,
  Github,
  Twitter,
  Instagram,
  Linkedin
} from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()
  const [isHovered, setIsHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
       redirectTo: 'https://my-vault-app-umber.vercel.app/auth/callback',
      },
    })
  }

  const features = [
    { icon: Zap, text: 'Real-time sync', color: 'yellow' },
    { icon: Shield, text: 'Private & secure', color: 'green' },
    { icon: Globe, text: 'Access anywhere', color: 'blue' },
    { icon: Star, text: 'Smart organization', color: 'purple' }
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-[#0A0A0A] to-black overflow-hidden">
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_70%,transparent_100%)]" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        {/* Glass Card Container */}
        <div 
          className="relative w-full max-w-5xl mx-auto"
          style={{
            transform: `perspective(1000px) rotateX(${mousePosition.y * 0.5}deg) rotateY(${mousePosition.x * 0.5}deg)`
          }}
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            
            {/* Left Column - Hero Content */}
            <div className="text-left space-y-8">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 animate-slide-down">
                <Sparkles size={16} className="text-yellow-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  The Future of Bookmarking
                </span>
              </div>

              {/* Main Title */}
              <h1 className="text-6xl lg:text-7xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Vault
                </span>
                <br />
                <span className="text-white">Your Digital</span>
                <br />
                <span className="relative">
                  <span className="text-white">Sanctuary</span>
                  <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </span>
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                Store, organize, and access your bookmarks instantly across all devices. 
                Beautifully designed for the modern web.
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/5 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`p-2 bg-${feature.color}-500/20 rounded-lg`}>
                      <feature.icon size={16} className={`text-${feature.color}-400`} />
                    </div>
                    <span className="text-sm font-medium text-gray-300">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-white">10k+</div>
                  <div className="text-sm text-gray-500">Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">50k+</div>
                  <div className="text-sm text-gray-500">Bookmarks Saved</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">99.9%</div>
                  <div className="text-sm text-gray-500">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Column - Login Card */}
            <div className="relative">
              {/* Floating Icons */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              
              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl animate-scale-in">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-50"></div>
                    <div className="relative p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                      <Bookmark size={32} className="text-white" />
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
                <p className="text-gray-400 text-center mb-8">Sign in to access your vault</p>

                {/* Google Login Button */}
                <button
                  onClick={handleGoogleLogin}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  disabled={loading}
                  className="relative w-full group overflow-hidden rounded-2xl bg-white hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {/* Animated Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-transform duration-500 ${
                    isHovered ? 'translate-x-0' : '-translate-x-full'
                  }`} />
                  
                  <div className="relative flex items-center justify-center gap-3 px-6 py-4">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill={isHovered ? '#FFFFFF' : '#4285F4'}
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill={isHovered ? '#FFFFFF' : '#34A853'}
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill={isHovered ? '#FFFFFF' : '#FBBC05'}
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill={isHovered ? '#FFFFFF' : '#EA4335'}
                      />
                    </svg>
                    <span className={`font-semibold transition-colors duration-300 ${
                      isHovered ? 'text-white' : 'text-gray-900'
                    }`}>
                      {loading ? 'Connecting...' : 'Continue with Google'}
                    </span>
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={20} className={`transition-all duration-300 ${
                        isHovered ? 'translate-x-1 text-white' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                </button>

                {/* Trust Indicators */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Lock size={14} />
                    <span>Enterprise-grade security</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4">
                    {[Github, Twitter, Instagram, Linkedin].map((Icon, index) => (
                      <a
                        key={index}
                        href="#"
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <Icon size={16} className="text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Privacy Note */}
                <p className="mt-6 text-xs text-center text-gray-600">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-blue-400 hover:underline">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-float {
          animation: float 15s infinite;
        }
        .animate-slide-down {
          animation: slideDown 0.6s ease-out;
        }
        .animate-slide-up {
          opacity: 0;
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}