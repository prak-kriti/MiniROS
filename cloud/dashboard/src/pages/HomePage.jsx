import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const highlights = [
  {
    title: 'Hybrid Cloud-Edge Runtime',
    desc: 'Heavy perception and analytics run in cloud microservices while ROS 2 edge nodes keep control loops responsive.',
  },
  {
    title: 'AI-Driven Monitoring',
    desc: 'Mini-ROS combines computer vision, object and face detection, and runtime prediction from live robot data.',
  },
  {
    title: 'Built for Scalable Robotics',
    desc: 'WebSockets, microservices, and Kubernetes-ready services make it practical for affordable single or multi-robot deployments.',
  },
  {
    title: 'Real-Time Dashboarding',
    desc: 'Operators can stream telemetry, inspect AI events, and issue control commands through one web surface.',
  },
];

const architecture = [
  {
    title: 'ROS 2 Edge Client',
    desc: 'Handles sensing, motor actuation, and time-critical line-following or delivery behavior near the robot.',
  },
  {
    title: 'Cloud Microservices',
    desc: 'Offloads expensive AI inference, prediction, and orchestration so low-cost hardware can stay lightweight.',
  },
  {
    title: 'Live Web Dashboard',
    desc: 'Streams telemetry and AI events in real time for monitoring, debugging, and intervention from anywhere.',
  },
];

const workflow = [
  'Edge nodes collect telemetry, voltage, and operational state through ROS 2 topics.',
  'Cloud services process perception and runtime prediction workloads with more compute headroom.',
  'Operators watch live trends, AI insights, and robot health through the dashboard and can push commands back to the edge.',
];

const keywords = [
  'ROS 2',
  'Cloud Robotics',
  'Edge Computing',
  'Hybrid Architecture',
  'Microservices',
  'gRPC',
  'WebSockets',
  'Object Detection',
  'Runtime Prediction',
  'Kubernetes',
  'Real-Time Control',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <div className="app-shell home-shell">
      <main className="page-content hero">
        <section className="hero-grid">
          <div className="hero-panel panel">
            <span className="eyebrow">Mini-ROS Research Framework</span>
            <h1 className="hero-title">
              A lightweight <span className="accent-text">cloud-edge</span> stack for intelligent ROS 2 robots.
            </h1>
            <p className="hero-copy">
              Mini-ROS is a hybrid robotics framework that balances real-time edge control with cloud-scale AI services.
              It pairs ROS 2 sensing and actuation with microservice-based analytics, live dashboarding, and predictive
              runtime estimation so affordable robots can behave like connected, intelligent systems.
            </p>
            <div className="hero-actions">
              <button className="button" onClick={() => navigate(isLoggedIn ? '/devices' : '/signup')}>
                {isLoggedIn ? 'Open Robot Workspace' : 'Launch Mini-ROS'}
              </button>
              <button className="ghost-button" onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}>
                View Live Telemetry
              </button>
            </div>
            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>ROS 2 + AI</strong>
                <span className="stat-caption">Perception and control in one loop</span>
              </div>
              <div className="hero-metric">
                <strong>Cloud + Edge</strong>
                <span className="stat-caption">Balanced compute placement</span>
              </div>
              <div className="hero-metric">
                <strong>Live Dashboard</strong>
                <span className="stat-caption">Telemetry, commands, and insight</span>
              </div>
            </div>
          </div>

          <div className="hero-side">
            <section className="hero-diagram panel">
              <div className="section-heading">
                <div>
                  <h2 className="section-title">Architecture Snapshot</h2>
                  <p className="section-copy">Mini-ROS distributes work where it belongs instead of forcing everything onto the robot.</p>
                </div>
              </div>
              <div className="stack-list">
                {architecture.map((item, index) => (
                  <div key={item.title}>
                    <div className="stack-item">
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                    {index < architecture.length - 1 && <div className="stack-arrow">-&gt;</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className="info-card panel">
              <h3>Abstract</h3>
              <p>
                The framework introduces AI-driven perception through a hybrid CNN-regression pipeline, predictive
                runtime estimation from voltage data, and cloud-managed microservices that improve responsiveness,
                scalability, and resource efficiency compared with heavier ROS deployments.
              </p>
            </section>
          </div>
        </section>

        <section style={{ marginTop: '26px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Project Highlights</span>
              <h2 className="section-title">Why Mini-ROS stands out</h2>
            </div>
          </div>
          <div className="feature-grid">
            {highlights.map((item, index) => (
              <article key={item.title} className="feature-card panel">
                <div className="feature-kicker">0{index + 1}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-grid" style={{ marginTop: '26px' }}>
          <article className="info-card panel">
            <span className="eyebrow">Introduction</span>
            <h2 className="section-title">Bridging limited robot hardware and modern intelligent robotics</h2>
            <p className="section-copy" style={{ marginTop: '14px' }}>
              ROS transformed robotics by promoting reusable, modular software, and ROS 2 extended that vision with DDS-based
              communication for stronger distributed performance, reliability, and security. Mini-ROS builds on that base to
              address a growing practical problem: low-cost robots increasingly need AI perception, analytics, and rich remote
              observability, but edge hardware alone often cannot deliver those features smoothly.
            </p>
            <p className="section-copy" style={{ marginTop: '14px' }}>
              By combining cloud robotics with edge computing, Mini-ROS keeps time-sensitive control close to the robot while
              moving heavier workloads such as analysis, visualization, and model-driven inference into the cloud. The result is
              a simpler path to scalable surveillance, delivery, automation, and multi-robot experimentation.
            </p>
          </article>

          <aside className="timeline-card panel">
            <span className="eyebrow">Operational Flow</span>
            <div className="timeline" style={{ marginTop: '16px' }}>
              {workflow.map((step, index) => (
                <div key={step} className="timeline-step">
                  <div className="timeline-index">{index + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="content-grid" style={{ marginTop: '26px' }}>
          <article className="info-card panel">
            <span className="eyebrow">Research Focus</span>
            <h2 className="section-title">Core design goals</h2>
            <ul className="bullet-list" style={{ marginTop: '16px' }}>
              <li>Improve runtime efficiency by pushing compute-heavy tasks to cloud infrastructure.</li>
              <li>Keep sensing and control loops responsive with ROS 2 execution on the edge.</li>
              <li>Expose robot behavior through real-time dashboard telemetry and AI event streams.</li>
              <li>Support low-cost and multi-robot systems without demanding expensive onboard hardware.</li>
            </ul>
          </article>

          <article className="info-card panel">
            <span className="eyebrow">Keywords</span>
            <h2 className="section-title">Technology stack</h2>
            <ul className="keyword-list" style={{ marginTop: '16px' }}>
              {keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
