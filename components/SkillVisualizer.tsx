import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { Skill } from '../types';

interface SkillVisualizerProps {
  skills: Skill[];
}

const SkillVisualizer: React.FC<SkillVisualizerProps> = ({ skills }) => {
  // Sort and take top 8 skills for clear visualization
  const chartData = skills
    .sort((a, b) => b.level - a.level)
    .slice(0, 8)
    .map(skill => ({
      subject: skill.name,
      A: skill.level,
      fullMark: 100,
    }));

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#0A66C2"
            fill="#0A66C2"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SkillVisualizer;