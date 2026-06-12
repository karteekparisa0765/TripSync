import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCheck,
  Users,
  Split,
  BadgeCheck,
  Receipt,
  CalendarRange,
  Calculator,
  MessageSquareMore,
  Route as RouteIcon,
  Heart,
  Sparkles,
  Star,
  MapPin,
  Wand2,
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  useEffect(() => {
    const counts = document.querySelectorAll('[data-count]');

    const animateCount = (el) => {
      const target = Number(el.getAttribute('data-count')) || 0;
      const duration = 1400;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(target * eased).toLocaleString();
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const countEl = entry.target.querySelector('[data-count]');
          if (countEl && !countEl.dataset.animated) {
            countEl.dataset.animated = 'true';
            animateCount(countEl);
          }
        });
      },
      { threshold: 0.4 }
    );

    counts.forEach((countEl) => {
      const parent = countEl.closest('.stat, .card, .glass-soft, .glass');
      if (parent) {
        observer.observe(parent);
      }
    });

    counts.forEach((countEl) => {
      if (countEl.closest('.stat') && !countEl.dataset.animated) {
        countEl.dataset.animated = 'true';
        animateCount(countEl);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page-wrapper text-slate-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/95 backdrop-blur-xl">
        <div className="landing-page-container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20">
              <RouteIcon className="w-5 h-5" />
            </div>
            <span className="text-lg">TripSync</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#previews" className="hover:text-white transition-colors">Product</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#cta" className="hover:text-white transition-colors">Get Started</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sm text-slate-300 hover:text-white md:inline-block">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-secondary text-sm px-4 py-2">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://cdn.landing-page.io/ai-landingpage/html-generate/33b93fb2-0c7a-4048-a84d-9a228639f0ca/images/auto-img-1-b82b9a9901e64b9c9481ac747f436891.png"
              alt="Travel background"
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 hero-bg" />
            <div className="absolute inset-0 grid-overlay opacity-50" />
          </div>

          <div className="landing-page-container relative z-10 py-20 md:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="fade-up">
                <div className="chip mb-6 w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Trusted by modern travel groups
                </div>

                <h1 className="section-title text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight max-w-3xl">
                  <span className="gradient-text">Travel Together.</span>
                  <br />
                  Split Smarter.
                </h1>

                <p className="mt-6 max-w-xl text-lg md:text-xl text-slate-300 leading-relaxed">
                  TripSync is the smart way for friends to plan trips, track shared expenses,
                  manage itineraries, coordinate activities, and settle payments without confusion.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link to="/register" className="btn btn-primary">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
                  <div className="glass-soft rounded-2xl p-4 stat">
                    <div className="text-2xl font-black" data-count="120">0</div>
                    <div className="text-xs text-slate-400 mt-1">Trips organized</div>
                  </div>
                  <div className="glass-soft rounded-2xl p-4 stat">
                    <div className="text-2xl font-black" data-count="4300">0</div>
                    <div className="text-xs text-slate-400 mt-1">Expenses settled</div>
                  </div>
                  <div className="glass-soft rounded-2xl p-4 stat">
                    <div className="text-2xl font-black" data-count="98">0</div>
                    <div className="text-xs text-slate-400 mt-1">Less chaos</div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute-top-6-left-4 glass-soft rounded-2xl p-4 w-56 animate-float hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-400/15 flex items-center justify-center text-emerald-300">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Auto-splitting</p>
                      <p className="text-xs text-slate-400">Calculates balances instantly</p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm text-slate-400">Live expense split</p>
                      <h2 className="text-2xl font-bold tracking-tight">Weekend in Lisbon</h2>
                    </div>
                    <div className="chip bg-emerald-400/10 text-emerald-300 border-emerald-300/15">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                      Updated now
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-5 mb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center font-bold text-white">
                          M
                        </div>
                        <div>
                          <p className="font-semibold">Maya paid for dinner</p>
                          <p className="text-sm text-slate-400">Restaurant, groceries, and taxis</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">$186</p>
                        <p className="text-xs text-slate-400">split among 4</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-4">
                    <div className="glass-soft rounded-2xl p-4">
                      <p className="text-sm font-semibold mb-3 text-slate-200">Who owes whom</p>
                      <div className="space-y-3">
                        {[
                          { initial: 'A', name: 'Ava owes Maya', amount: '$46.50' },
                          { initial: 'J', name: 'Jules owes Maya', amount: '$46.50' },
                          { initial: 'N', name: 'Noah owes Maya', amount: '$46.50' },
                        ].map((item) => (
                          <div key={item.initial} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-200 flex items-center justify-center text-xs font-bold">
                                {item.initial}
                              </div>
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm text-amber-300">{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="glass-soft rounded-2xl p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">Settlement</p>
                        <p className="text-lg font-bold">$139.50</p>
                        <p className="text-sm text-slate-400">Collected with 1 tap</p>
                      </div>
                      <div className="glass-soft rounded-2xl p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">Trip budget</p>
                        <p className="text-lg font-bold">74% used</p>
                        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
                        </div>
                        <p className="text-sm text-slate-400 mt-2">Still within plan</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute-bottom-5-right-4 glass-soft rounded-2xl p-4 w-52 animate-float-delay hidden md:block">
                  <p className="text-xs text-slate-400">Next activity</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-400/15 flex items-center justify-center text-cyan-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Sunset ferry</p>
                      <p className="text-xs text-slate-400">7:30 PM • 12 travelers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="py-20 md:py-24">
          <div className="landing-page-container">
            <div className="max-w-3xl">
              <p className="chip mb-4 w-fit">Problem → Solution</p>
              <h2 className="section-title text-3xl md:text-5xl font-black tracking-tight">
                Group trips get messy fast.
              </h2>
              <p className="mt-4 text-slate-300 text-lg leading-relaxed">
                Different payment methods, shared reservations, group chats full of decisions, and nobody sure who owes what.
                TripSync turns that chaos into one shared source of truth.
              </p>
            </div>

            <div className="mt-10 grid lg:grid-cols-3 gap-5">
              <div className="card p-6">
                <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-300 flex items-center justify-center mb-4">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Expense confusion</h3>
                <p className="text-slate-400">People pay at different times, receipts get lost, and reimbursements drag on.</p>
              </div>
              <div className="card p-6">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center mb-4">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Trip plans everywhere</h3>
                <p className="text-slate-400">Itineraries live in spreadsheets, notes apps, and random chat messages.</p>
              </div>
              <div className="card p-6">
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center mb-4">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Settlements take forever</h3>
                <p className="text-slate-400">Everyone wants a fair split, but no one wants to manually do the math.</p>
              </div>
            </div>

            <div className="mt-6 card p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div>
                  <p className="text-sm text-slate-400 mb-2">TripSync solution</p>
                  <h3 className="text-2xl font-bold">One collaborative workspace for everything.</h3>
                </div>
                <div className="md:col-span-2 grid sm:grid-cols-3 gap-4">
                  <div className="glass-soft rounded-2xl p-4">
                    <Users className="w-5 h-5 text-violet-300 mb-2" />
                    <p className="font-semibold">Shared planning</p>
                    <p className="text-sm text-slate-400">Invite the whole group</p>
                  </div>
                  <div className="glass-soft rounded-2xl p-4">
                    <Split className="w-5 h-5 text-cyan-300 mb-2" />
                    <p className="font-semibold">Automatic splits</p>
                    <p className="text-sm text-slate-400">Equal or custom shares</p>
                  </div>
                  <div className="glass-soft rounded-2xl p-4">
                    <BadgeCheck className="w-5 h-5 text-emerald-300 mb-2" />
                    <p className="font-semibold">Clear settlements</p>
                    <p className="text-sm text-slate-400">Who pays who, instantly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-24 bg-white/[0.02] border-y border-white/8">
          <div className="landing-page-container">
            <div className="max-w-3xl">
              <p className="chip mb-4 w-fit">Features</p>
              <h2 className="section-title text-3xl md:text-5xl font-black tracking-tight">Everything a travel group needs.</h2>
              <p className="mt-4 text-slate-300 text-lg">Modern tools for planning, splitting, and staying synced before and during the trip.</p>
            </div>

            <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              <div className="card p-6">
                <Sparkles className="w-6 h-6 text-violet-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Smart Expense Splitting</h3>
                <p className="text-slate-400">Split by person, percentage, custom amounts, or multi-day shared costs with automatic balance updates.</p>
              </div>
              <div className="card p-6">
                <Receipt className="w-6 h-6 text-cyan-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Budget Tracking</h3>
                <p className="text-slate-400">See the trip budget at a glance with live spend, remaining headroom, and category breakdowns.</p>
              </div>
              <div className="card p-6">
                <MessageSquareMore className="w-6 h-6 text-emerald-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Group Chat</h3>
                <p className="text-slate-400">Keep decisions, expense notes, and trip updates in one place without switching apps.</p>
              </div>
              <div className="card p-6">
                <RouteIcon className="w-6 h-6 text-fuchsia-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Trip Itinerary Planning</h3>
                <p className="text-slate-400">Build a shared schedule with activities, reservations, time blocks, and live status updates.</p>
              </div>
              <div className="card p-6">
                <Heart className="w-6 h-6 text-pink-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Places Wishlist</h3>
                <p className="text-slate-400">Save restaurants, bars, viewpoints, and activities the group wants to try together.</p>
              </div>
              <div className="card p-6">
                <Calculator className="w-6 h-6 text-amber-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Settlement Optimization</h3>
                <p className="text-slate-400">Reduce the number of transfers owed so the group can settle up with minimal friction.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="previews" className="py-20 md:py-24">
          <div className="landing-page-container">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="card p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm text-slate-400">Application preview</p>
                    <h3 className="text-2xl font-bold">Trip dashboard</h3>
                  </div>
                  <div className="chip">4 travelers online</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-soft rounded-2xl p-4">
                    <p className="text-sm text-slate-400">Budget left</p>
                    <p className="text-3xl font-black mt-1">$312</p>
                    <p className="text-xs text-emerald-300 mt-2">On track for the weekend</p>
                  </div>
                  <div className="glass-soft rounded-2xl p-4">
                    <p className="text-sm text-slate-400">Upcoming</p>
                    <p className="text-xl font-bold mt-1">Museum lunch</p>
                    <p className="text-xs text-slate-400 mt-2">Today • 1:00 PM</p>
                  </div>
                </div>
                <div className="mt-4 glass-soft rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">This week’s spend</p>
                    <p className="text-sm text-slate-400">$924 total</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>Food</span>
                    <span>Stay</span>
                    <span>Transit</span>
                    <span>Activities</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Shared chat</h3>
                    <Wand2 className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold">K</div>
                      <div className="glass-soft rounded-2xl rounded-tl-md p-3 max-w-md">
                        <p className="text-sm">Can we move the wine tasting to Friday?</p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="glass-soft rounded-2xl rounded-tr-md p-3 max-w-md bg-cyan-500/10">
                        <p className="text-sm">Yes — updated. I also split the cab from the airport.</p>
                      </div>
                      <div className="h-9 w-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold">T</div>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Settlement optimization</h3>
                    <span className="chip text-emerald-300 bg-emerald-400/10 border-emerald-400/15">2 transfers</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between glass-soft rounded-2xl p-4">
                      <span className="text-sm">Noah → Maya</span>
                      <span className="font-semibold text-amber-300">$46.50</span>
                    </div>
                    <div className="flex items-center justify-between glass-soft rounded-2xl p-4">
                      <span className="text-sm">Ava → Maya</span>
                      <span className="font-semibold text-amber-300">$93.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-5">
              <div className="card p-6">
                <p className="text-sm text-slate-400">Preview</p>
                <h4 className="font-bold text-lg">Expense feed</h4>
                <p className="text-slate-400 mt-2">Every payment logged with payer, category, and exact split.</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-400">Preview</p>
                <h4 className="font-bold text-lg">Trip itinerary</h4>
                <p className="text-slate-400 mt-2">Drag-and-drop day plans with maps, notes, and reservations.</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-400">Preview</p>
                <h4 className="font-bold text-lg">Wishlist board</h4>
                <p className="text-slate-400 mt-2">Save spots the group can vote on before booking.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24 bg-white/[0.02] border-y border-white/8">
          <div className="landing-page-container">
            <div className="grid md:grid-cols-4 gap-5">
              <div className="card p-6">
                <p className="text-sm text-slate-400">Trips planned</p>
                <p className="text-4xl font-black mt-2" data-count="2500">0</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-400">Shared expenses</p>
                <p className="text-4xl font-black mt-2" data-count="180000">0</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-400">Minutes saved</p>
                <p className="text-4xl font-black mt-2" data-count="9600">0</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-400">Traveler rating</p>
                <p className="text-4xl font-black mt-2">4.9/5</p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20 md:py-24">
          <div className="landing-page-container">
            <div className="max-w-3xl">
              <p className="chip mb-4 w-fit">Testimonials</p>
              <h2 className="section-title text-3xl md:text-5xl font-black tracking-tight">
                Loved by travelers who like to keep things easy.
              </h2>
            </div>

            <div className="mt-10 grid lg:grid-cols-3 gap-5">
              {[
                {
                  quote: '“TripSync saved our Iceland trip. Expenses were clean, the itinerary was shared, and nobody had to chase people for money.”',
                  author: '— Gokul Mani Sujith, frequent group traveler',
                },
                {
                  quote: '“It feels like Notion for trips and Splitwise for money, but designed beautifully for real group travel.”',
                  author: '— G Charan Reddy, product designer',
                },
                {
                  quote: '“We used it for a bachelor trip and settled everything before the flight home. Absolutely painless.”',
                  author: '— Vandavasi Manikanta, weekend trip organizer',
                },
              ].map((testimonial, index) => (
                <div key={index} className="card p-6">
                  <div className="flex items-center gap-1 text-amber-300 mb-4">
                    {[...Array(5)].map((_, starIndex) => (
                      <Star key={starIndex} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{testimonial.quote}</p>
                  <p className="mt-4 text-sm text-slate-400">{testimonial.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cta" className="py-20 md:py-24">
          <div className="landing-page-container">
            <div className="card p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
              </div>
              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="section-title text-3xl md:text-5xl font-black tracking-tight">
                  Start planning stress-free trips today.
                </h2>
                <p className="mt-4 text-lg text-slate-300 leading-relaxed">
                  Bring your group together in one place and let TripSync handle the math, the planning, and the follow-up.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register" className="btn btn-primary">
                    Get Started Free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 py-10 text-center text-sm text-slate-300">
        Made With Love By Parisa Karteek ❤️
      </footer>
    </div>
  );
};

export default LandingPage;
