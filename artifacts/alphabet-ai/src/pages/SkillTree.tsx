import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetSkillTree,
  useListMastery,
  getGetSkillTreeQueryKey,
} from "@workspace/api-client-react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, DOMAIN_COLORS, MASTERY_COLORS, MASTERY_LABELS } from "@/lib/constants";
import Layout from "@/components/Layout";
import SmartScoreRing from "@/components/SmartScoreRing";

export default function SkillTree() {
  const [grade, setGrade] = useState("5th");
  const [search, setSearch] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const { data: tree, isLoading: treeLoading } = useGetSkillTree(
    { gradeLevel: grade },
    { query: { queryKey: getGetSkillTreeQueryKey({ gradeLevel: grade }) } }
  );
  const { data: masteryList } = useListMastery();

  const masteryMap = new Map(masteryList?.map((m) => [m.skillCode, m]) ?? []);

  const filteredDomains = (tree as any)?.domains?.map((d: any) => ({
    ...d,
    skills: d.skills.filter((s: any) =>
      !search || s.skillName.toLowerCase().includes(search.toLowerCase()) || s.skillCode.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((d: any) => d.skills.length > 0) ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">ELA Skill Tree</h1>
          <p className="text-sm text-muted-foreground">Browse all skills by grade and domain. Track your mastery progress.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-skill-search"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {GRADE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                data-testid={`btn-grade-filter-${g}`}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  grade === g ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {treeLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : filteredDomains.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No skills found</p>
            <p className="text-sm">Try a different grade or search term.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredDomains.map((domain: any, di: number) => {
              const color = DOMAIN_COLORS[domain.domainCode] ?? "#6b7280";
              const domainMastery = domain.skills.map((s: any) => masteryMap.get(s.skillCode)).filter(Boolean);
              const masteredCount = domainMastery.filter((m: any) => m?.masteryLevel === "mastered").length;
              return (
                <motion.div
                  key={domain.domainCode}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: di * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                >
                  {/* Domain header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>
                      {domain.domainCode}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{domain.domain}</h3>
                      <p className="text-xs text-muted-foreground">{masteredCount}/{domain.skills.length} mastered</p>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${domain.skills.length > 0 ? (masteredCount / domain.skills.length) * 100 : 0}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="divide-y divide-gray-50">
                    {domain.skills.map((skill: any) => {
                      const mastery = masteryMap.get(skill.skillCode);
                      const level = mastery?.masteryLevel ?? "not_started";
                      const smartScore = mastery?.smartScore ?? 0;
                      const isExpanded = expandedSkill === skill.skillCode;
                      return (
                        <div key={skill.skillCode}>
                          <button
                            onClick={() => setExpandedSkill(isExpanded ? null : skill.skillCode)}
                            data-testid={`skill-card-${skill.skillCode}`}
                            className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <SmartScoreRing score={smartScore} size={40} strokeWidth={4} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{skill.skillName}</p>
                              <p className="text-xs text-muted-foreground">{skill.skillCode}</p>
                            </div>
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0", MASTERY_COLORS[level] ?? "bg-gray-200 text-gray-600")}>
                              {MASTERY_LABELS[level] ?? level}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              className="px-5 pb-4 bg-gray-50"
                            >
                              {skill.description && <p className="text-sm text-gray-700 mb-3 pt-3">{skill.description}</p>}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {skill.standardLeafCode && <span>Standard: <strong className="text-foreground">{skill.standardLeafCode}</strong></span>}
                                {skill.parentGseCode && <span>GSE: <strong className="text-foreground">{skill.parentGseCode}</strong></span>}
                                {skill.parentCcssCode && <span>CCSS: <strong className="text-foreground">{skill.parentCcssCode}</strong></span>}
                                <span>Difficulty: <strong className="text-foreground">{skill.difficulty?.toFixed(1)}</strong></span>
                              </div>
                              {skill.culturallyRelevantThemes && skill.culturallyRelevantThemes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(skill.culturallyRelevantThemes as string[]).map((t) => (
                                    <span key={t} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{t}</span>
                                  ))}
                                </div>
                              )}
                              {skill.nextSkillCodes && skill.nextSkillCodes.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">Unlocks: {(skill.nextSkillCodes as string[]).join(", ")}</p>
                              )}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
