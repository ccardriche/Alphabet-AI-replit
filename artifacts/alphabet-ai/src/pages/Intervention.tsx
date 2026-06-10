import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetInterventionPathway } from "@workspace/api-client-react";
import { AlertTriangle, Target, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/constants";
import Layout from "@/components/Layout";
import SmartScoreRing from "@/components/SmartScoreRing";

const PHASE_COLORS = ["bg-red-50 border-red-200", "bg-amber-50 border-amber-200", "bg-green-50 border-green-200"];
const PHASE_ICONS = [AlertTriangle, Target, TrendingUp];
const PHASE_ICON_COLORS = ["text-red-500", "text-amber-500", "text-green-500"];

export default function Intervention() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetInterventionPathway();

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <div className="p-6 text-center py-20">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-semibold mb-2">No intervention pathway</h2>
        <p className="text-sm text-muted-foreground mb-6">Complete your placement assessment to get your personalized intervention plan.</p>
        <Button onClick={() => setLocation("/placement")} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          Take Placement Assessment
        </Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Intervention Pathway</h1>
          <p className="text-sm text-muted-foreground">Your personalized 3-phase catch-up plan.</p>
        </div>

        {/* Grade gap summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm mb-1">Grade Gap</p>
              <p className="text-4xl font-extrabold">{data.gradeGap > 0 ? `-${data.gradeGap}` : "On Level"}</p>
              <p className="text-indigo-200 text-sm mt-1">{data.gradeGap > 0 ? `${data.gradeGap} grade level${data.gradeGap > 1 ? "s" : ""} below enrolled grade` : "Reading at grade level"}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-sm mb-1">Current Phase</p>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 text-2xl font-bold">
                {data.currentPhase}
              </div>
            </div>
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-5">
          {data.phases.map((phase, pi) => {
            const Icon = PHASE_ICONS[pi] ?? Target;
            const iconColor = PHASE_ICON_COLORS[pi] ?? "text-gray-500";
            const cardClass = PHASE_COLORS[pi] ?? "bg-gray-50 border-gray-200";
            const isActive = data.currentPhase === phase.phaseNumber;
            return (
              <motion.div
                key={phase.phaseNumber}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.1 }}
                className={cn("rounded-2xl border overflow-hidden", cardClass, isActive ? "ring-2 ring-indigo-500" : "")}
              >
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-white/70")}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Phase {phase.phaseNumber}: {phase.name}</h3>
                      {isActive && <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-medium">Active</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{phase.skills.length} skills</span>
                </div>

                {phase.skills.length > 0 && (
                  <div className="px-5 pb-4 space-y-2">
                    {phase.skills.slice(0, 4).map((skill) => (
                      <div key={skill.skillCode} className="flex items-center gap-3 bg-white/70 rounded-xl p-3">
                        <SmartScoreRing score={skill.smartScore} size={36} strokeWidth={3.5} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{skill.skillName}</p>
                          <div className="h-1 rounded-full bg-gray-200 mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-700 bg-indigo-500"
                              style={{ width: `${skill.masteryPercentage}%` }}
                            />
                          </div>
                        </div>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0", MASTERY_COLORS[skill.masteryLevel] ?? "bg-gray-200 text-gray-600")}>
                          {MASTERY_LABELS[skill.masteryLevel] ?? skill.masteryLevel}
                        </span>
                      </div>
                    ))}
                    {phase.skills.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">+{phase.skills.length - 4} more skills</p>
                    )}
                    {isActive && (
                      <Button
                        onClick={() => setLocation("/practice")}
                        className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                        data-testid="btn-practice-intervention"
                      >
                        Practice These Skills <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
