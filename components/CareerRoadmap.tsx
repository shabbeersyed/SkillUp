import React from 'react';
import { RoadmapStep } from '../types';

interface CareerRoadmapProps {
  steps: RoadmapStep[];
}

const CareerRoadmap: React.FC<CareerRoadmapProps> = ({ steps }) => {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {steps.map((step, index) => (
        <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
          {/* Dot */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-hover:bg-brand-primary text-slate-500 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-300">
            <span className="text-sm font-bold">{index + 1}</span>
          </div>
          
          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-900">{step.phase}</h4>
              <span className="text-xs font-medium text-brand-primary bg-brand-primarySoft px-2 py-1 rounded-full">{step.duration}</span>
            </div>
            <p className="text-sm text-slate-600 mb-3">{step.objective}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {step.skillsToLearn.map((skill, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  {skill}
                </span>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Resources</h5>
              <div className="space-y-2">
                {step.resources.map((res, i) => (
                  <div key={i} className="flex items-start gap-2 group/res">
                    <div className="mt-1">
                      {res.type === 'Course' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                      {res.type === 'Certification' && <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>}
                      {res.type === 'Project' && <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>}
                      {res.type === 'Book' && <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-700 group-hover/res:text-brand-primary transition-colors">{res.title}</p>
                      <p className="text-[10px] text-slate-500">{res.relevance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareerRoadmap;