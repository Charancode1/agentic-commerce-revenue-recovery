import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  progress: number;
  speed: number;
  type: 'nominal' | 'failure' | 'recovery';
  color: string;
  size: number;
  trail: { x: number; y: number }[];
  amount: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export const AgenticDefenseVisual: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [telemetryEvent, setTelemetryEvent] = useState<string>('Monitoring live payment flow...');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    // Nodes
    const getNodePos = () => ({
      checkout: { x: width * 0.12, y: height * 0.50, label: 'Checkout', sub: 'Shopper Cart' },
      gateway: { x: width * 0.35, y: height * 0.50, label: 'Payment Gateway', sub: 'Bank Auth' },
      atRisk: { x: width * 0.48, y: height * 0.22, label: 'Revenue at Risk', sub: 'Intercepted' },
      agent: { x: width * 0.68, y: height * 0.22, label: 'Recovery Agent', sub: 'Gemini AI' },
      policy: { x: width * 0.68, y: height * 0.68, label: 'Policy Guardrails', sub: 'Bounded' },
      recovered: { x: width * 0.90, y: height * 0.50, label: 'Recovered Revenue', sub: 'Razorpay Smart Link' }
    });

    const particles: Particle[] = [];
    const sparks: Spark[] = [];
    let tick = 0;

    const spawnParticle = (type: 'nominal' | 'failure') => {
      const nodes = getNodePos();
      if (type === 'nominal') {
        particles.push({
          x: nodes.checkout.x,
          y: nodes.checkout.y,
          originX: nodes.checkout.x,
          originY: nodes.checkout.y,
          targetX: nodes.gateway.x,
          targetY: nodes.gateway.y,
          progress: 0,
          speed: 0.008 + Math.random() * 0.004,
          type: 'nominal',
          color: '#38BDF8',
          size: 3.5,
          trail: [],
          amount: Math.floor(1999 + Math.random() * 3000)
        });
      } else {
        particles.push({
          x: nodes.checkout.x,
          y: nodes.checkout.y,
          originX: nodes.checkout.x,
          originY: nodes.checkout.y,
          targetX: nodes.gateway.x,
          targetY: nodes.gateway.y,
          progress: 0,
          speed: 0.007,
          type: 'failure',
          color: '#FB7185',
          size: 4.5,
          trail: [],
          amount: 4999
        });
      }
    };

    const addSparks = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          size: 1.5 + Math.random() * 2
        });
      }
    };

    let lastSpawn = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      const nodes = getNodePos();

      // Background subtle grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1;
      const gridSize = 40 * window.devicePixelRatio;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw connection corridors
      const drawPath = (from: { x: number; y: number }, to: { x: number; y: number }, color = 'rgba(56, 189, 248, 0.15)', dashed = false) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * window.devicePixelRatio;
        if (dashed) ctx.setLineDash([4 * window.devicePixelRatio, 6 * window.devicePixelRatio]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
      };

      // Corridors
      drawPath(nodes.checkout, nodes.gateway, 'rgba(56, 189, 248, 0.2)');
      drawPath(nodes.gateway, nodes.atRisk, 'rgba(251, 113, 133, 0.3)', true);
      drawPath(nodes.atRisk, nodes.agent, 'rgba(129, 140, 248, 0.35)');
      drawPath(nodes.agent, nodes.policy, 'rgba(16, 185, 129, 0.3)', true);
      drawPath(nodes.policy, nodes.recovered, 'rgba(52, 211, 153, 0.4)');
      drawPath(nodes.gateway, nodes.recovered, 'rgba(56, 189, 248, 0.1)');

      // Periodic spawn
      if (tick - lastSpawn > 85) {
        lastSpawn = tick;
        if (Math.random() < 0.45) {
          spawnParticle('failure');
        } else {
          spawnParticle('nominal');
        }
      }

      // Update & render particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;

        // Trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        // Position interpolation
        p.x = p.originX + (p.targetX - p.originX) * p.progress;
        p.y = p.originY + (p.targetY - p.originY) * p.progress;

        // Draw trail
        for (let t = 0; t < p.trail.length; t++) {
          const tp = p.trail[t];
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, p.size * (t / p.trail.length) * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (t / p.trail.length) * 0.4;
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10 * window.devicePixelRatio;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Waypoint transitions
        if (p.progress >= 1) {
          if (p.type === 'nominal') {
            // Normal payment reached gateway, then flows to success
            if (p.targetX === nodes.gateway.x && p.targetY === nodes.gateway.y) {
              p.originX = nodes.gateway.x;
              p.originY = nodes.gateway.y;
              p.targetX = nodes.recovered.x;
              p.targetY = nodes.recovered.y;
              p.progress = 0;
            } else {
              addSparks(nodes.recovered.x, nodes.recovered.y, '#38BDF8', 6);
              particles.splice(i, 1);
            }
          } else if (p.type === 'failure') {
            // Failed at gateway! Detour to Revenue at Risk
            if (p.targetX === nodes.gateway.x && p.targetY === nodes.gateway.y) {
              addSparks(nodes.gateway.x, nodes.gateway.y, '#FB7185', 14);
              setTelemetryEvent('⚠️ Payment failed at gateway (Card limit) → Intercepted as Revenue at Risk');
              p.originX = nodes.gateway.x;
              p.originY = nodes.gateway.y;
              p.targetX = nodes.atRisk.x;
              p.targetY = nodes.atRisk.y;
              p.progress = 0;
              p.color = '#F43F5E';
            } else if (p.targetX === nodes.atRisk.x && p.targetY === nodes.atRisk.y) {
              // Reached Revenue at Risk, agent picks it up
              addSparks(nodes.atRisk.x, nodes.atRisk.y, '#818CF8', 8);
              setTelemetryEvent('🧠 Gemini Recovery Agent analyzing failure context & formulating strategy...');
              p.originX = nodes.atRisk.x;
              p.originY = nodes.atRisk.y;
              p.targetX = nodes.agent.x;
              p.targetY = nodes.agent.y;
              p.progress = 0;
              p.color = '#A78BFA';
              p.type = 'recovery';
            }
          } else if (p.type === 'recovery') {
            // Flow from Agent to Policy Guardrails
            if (p.targetX === nodes.agent.x && p.targetY === nodes.agent.y) {
              setTelemetryEvent('🛡️ Policy Engine evaluating: Discount capped at ₹400 (8%), within 12% guardrail');
              addSparks(nodes.agent.x, nodes.agent.y, '#34D399', 10);
              p.originX = nodes.agent.x;
              p.originY = nodes.agent.y;
              p.targetX = nodes.policy.x;
              p.targetY = nodes.policy.y;
              p.progress = 0;
              p.color = '#10B981';
            } else if (p.targetX === nodes.policy.x && p.targetY === nodes.policy.y) {
              // Policy approved, dispatching Razorpay smart link
              setTelemetryEvent('⚡ Customer consented: Executing Razorpay Test Mode Smart Link...');
              addSparks(nodes.policy.x, nodes.policy.y, '#34D399', 12);
              p.originX = nodes.policy.x;
              p.originY = nodes.policy.y;
              p.targetX = nodes.recovered.x;
              p.targetY = nodes.recovered.y;
              p.progress = 0;
              p.color = '#34D399';
              p.size = 5;
            } else {
              // Final arrival at Recovered Revenue!
              addSparks(nodes.recovered.x, nodes.recovered.y, '#34D399', 24);
              setTelemetryEvent('🎉 Revenue Defended! At-risk transaction successfully recovered via Razorpay');
              particles.splice(i, 1);
            }
          }
        }
      }

      // Update & render sparks
      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= 0.025;
        if (sp.alpha <= 0) {
          sparks.splice(s, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw Nodes
      const drawNode = (
        pos: { x: number; y: number },
        title: string,
        subtitle: string,
        themeColor: string,
        pulse = false
      ) => {
        // Outer glow
        const pulseFactor = pulse ? Math.sin(tick * 0.05) * 3 : 0;
        const radius = 14 * window.devicePixelRatio + pulseFactor;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = themeColor;
        ctx.globalAlpha = 0.08;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0B0F17';
        ctx.globalAlpha = 0.95;
        ctx.fill();

        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Inner core
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5 * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 10 * window.devicePixelRatio;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Labels
        ctx.font = `600 ${10 * window.devicePixelRatio}px Inter, sans-serif`;
        ctx.fillStyle = '#F1F5F9';
        ctx.textAlign = 'center';
        ctx.fillText(title, pos.x, pos.y + 24 * window.devicePixelRatio);

        ctx.font = `400 ${8.5 * window.devicePixelRatio}px Inter, sans-serif`;
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(subtitle, pos.x, pos.y + 35 * window.devicePixelRatio);
      };

      drawNode(nodes.checkout, 'Checkout', 'Cart Session', '#38BDF8');
      drawNode(nodes.gateway, 'Payment Gateway', 'Bank Auth', '#818CF8', true);
      drawNode(nodes.atRisk, 'Revenue at Risk', 'Intercepted', '#FB7185', true);
      drawNode(nodes.agent, 'Recovery Agent', 'Gemini AI', '#A78BFA', true);
      drawNode(nodes.policy, 'Policy Guardrails', 'Bounded', '#34D399');
      drawNode(nodes.recovered, 'Recovered Revenue', 'Razorpay Smart Link', '#10B981', true);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#070A10',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(2, 132, 199, 0.05)'
    }}>
      {/* Top HUD Telemetry Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: 'rgba(11, 15, 23, 0.85)',
        borderBottom: '1px solid rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(10px)',
        fontSize: '0.75rem',
        color: '#94A3B8',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px #10B981'
          }} />
          <span style={{ fontWeight: 600, color: '#F1F5F9', letterSpacing: '0.04em' }}>
            AGENTIC REVENUE RECOVERY NETWORK
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.725rem' }}>
          <span style={{ color: '#38BDF8' }}>
            Defense Pipeline: <strong style={{ color: '#F1F5F9' }}>Active</strong>
          </span>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ position: 'relative', width: '100%', height: '280px' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* Dynamic Telemetry Status Caption */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          backdropFilter: 'blur(8px)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.7rem',
          color: '#E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          maxWidth: '90%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>TELEMETRY:</span>
          <span>{telemetryEvent}</span>
        </div>
      </div>
    </div>
  );
};
