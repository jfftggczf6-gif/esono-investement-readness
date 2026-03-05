import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2, LogIn, Rocket, GraduationCap, CheckCircle2, ArrowRight, BookOpen, Sparkles, Users } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-display font-bold text-foreground tracking-tight">ESONO</span>
            <span className="text-sm text-muted-foreground font-medium hidden sm:inline">INVESTMENT READINESS</span>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Se connecter
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[hsl(222,47%,14%)] to-[hsl(222,47%,22%)] text-white">
        <div className="container py-16 md:py-20">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">
            Plateforme IA + Coaching humain
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight max-w-2xl">
            Accompagnez les PME africaines vers l'Investment Readiness
          </h1>
          <p className="text-base md:text-lg text-white/60 mt-4 max-w-xl">
            Structuration du business model, modélisation financière, génération automatique de livrables investisseurs — en 8 modules guidés.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { icon: BookOpen, label: 'Micro-learning' },
              { icon: Sparkles, label: 'IA assistée' },
              { icon: Users, label: 'Coaching humain' },
            ].map(badge => (
              <span
                key={badge.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium"
              >
                <badge.icon className="h-3.5 w-3.5" />
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section className="container py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-display font-bold text-foreground">Choisissez votre espace</h2>
          <p className="text-muted-foreground mt-2">Deux profils, une même plateforme.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Entrepreneur */}
          <div className="bg-card rounded-xl border p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground">Espace Entrepreneur</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Uploadez vos documents, complétez les 8 modules et générez votre dossier investisseur complet.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                'Business Model Canvas, SIC, Inputs financiers',
                'Génération IA : Framework, Diagnostic, OVO, BP',
                '+10 livrables (Excel, HTML, Word, PDF)',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register?role=entrepreneur"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Créer mon compte entrepreneur <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Coach */}
          <div className="bg-card rounded-xl border p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-info" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground">Espace Coach</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Gérez vos entrepreneurs, suivez leur progression, analysez leurs dossiers et générez les livrables.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                'Dashboard de suivi multi-entrepreneurs',
                'Accès aux dossiers et livrables de chaque PME',
                'Templates vierges à distribuer',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register?role=coach"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Créer mon compte coach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 text-center">
          {[
            { value: '8 modules', label: 'Parcours séquentiel' },
            { value: 'XOF / FCFA', label: 'Devise par défaut' },
            { value: 'IA + Coach', label: 'Double validation' },
          ].map(stat => (
            <div key={stat.value}>
              <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
