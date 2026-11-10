import { counsellingQuestionById } from "../counselling/counselling-data";
import type {
  CounsellingAnswer,
  SessionRead,
} from "../counselling/counselling-engine";
import {
  possibilityFields,
  type PossibilityField,
} from "../discover/possibility-fields";

type FieldRelationship = "direct" | "supporting" | "requires_clarification";

type FieldConnection = {
  questionId: string;
  answerId: string;
  fieldId: PossibilityField["id"];
  relationship: FieldRelationship;
  contextOptionId?: string;
};

const fieldConnections: FieldConnection[] = [
  { questionId: "Q001", answerId: "using-computers-or-technology", fieldId: "technology", relationship: "direct" },
  { questionId: "Q001", answerId: "drawing-designing-or-making-things", fieldId: "arts-design", relationship: "direct" },
  { questionId: "Q001", answerId: "videos-movies-or-content", fieldId: "media", relationship: "direct" },
  { questionId: "Q001", answerId: "outdoors-or-nature", fieldId: "agriculture-environment", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "computers-or-digital-technology", fieldId: "technology", relationship: "direct" },
  { questionId: "Q005", answerId: "machines-structures-or-how-things-are-built", fieldId: "engineering", relationship: "direct" },
  { questionId: "Q005", answerId: "the-human-body", fieldId: "healthcare", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "the-human-body", fieldId: "science", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "nature-or-the-natural-world", fieldId: "agriculture-environment", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "technology-or-machines", fieldId: "technology", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "nature-or-the-world", fieldId: "agriculture-environment", relationship: "requires_clarification" },
  { questionId: "Q005", answerId: "design-or-creation", fieldId: "arts-design", relationship: "direct" },
  { questionId: "Q005", answerId: "stories-or-media", fieldId: "media", relationship: "direct" },
  { questionId: "Q005", answerId: "people-behaviour-or-communities", fieldId: "social-sciences", relationship: "direct" },
  { questionId: "Q005", answerId: "business-or-money", fieldId: "business", relationship: "direct" },
  { questionId: "Q005", answerId: "design-or-creative-expression", fieldId: "arts-design", relationship: "direct" },
  { questionId: "Q005", answerId: "stories-news-film-or-media", fieldId: "media", relationship: "direct" },
  { questionId: "Q005", answerId: "rules-rights-or-justice", fieldId: "law", relationship: "direct" },
  { questionId: "Q005", answerId: "government-public-decisions-or-public-services", fieldId: "government", relationship: "direct" },
  { questionId: "Q005", answerId: "science-experiments-or-discoveries", fieldId: "science", relationship: "direct" },
  { questionId: "Q005", answerId: "travel-places-or-different-cultures", fieldId: "hospitality-tourism", relationship: "direct" },
  { questionId: "Q006", answerId: "build-or-improve-a-practical-object-or-machine", fieldId: "engineering", relationship: "direct" },
  { questionId: "Q006", answerId: "investigate-or-experiment", fieldId: "science", relationship: "direct" },
  { questionId: "Q006", answerId: "learn-about-people", fieldId: "social-sciences", relationship: "direct" },
  { questionId: "Q006", answerId: "explore-nature", fieldId: "agriculture-environment", relationship: "direct" },
  { questionId: "Q006", answerId: "design-something", fieldId: "arts-design", relationship: "direct" },
  { questionId: "Q006", answerId: "solve-a-real-world-problem", fieldId: "engineering", relationship: "supporting" },
  { questionId: "Q006", answerId: "learn-how-a-business-works", fieldId: "business", relationship: "direct" },
  { questionId: "T01", answerId: "understanding-how-computers-and-devices-work", fieldId: "technology", relationship: "direct" },
  { questionId: "T01", answerId: "creating-digital-things", fieldId: "technology", relationship: "direct" },
  { questionId: "T01", answerId: "finding-ways-to-solve-problems-using-technology", fieldId: "technology", relationship: "direct" },
  { questionId: "T01", answerId: "understanding-how-technology-is-used-in-everyday-life", fieldId: "technology", relationship: "supporting" },
  { questionId: "A01", answerId: "drawing-or-visual-art", fieldId: "arts-design", relationship: "direct" },
  { questionId: "A01", answerId: "designing-how-something-looks-or-works", fieldId: "arts-design", relationship: "direct" },
  { questionId: "A01", answerId: "making-things-by-hand", fieldId: "arts-design", relationship: "direct" },
  { questionId: "A01", answerId: "creating-digital-content", fieldId: "media", relationship: "direct" },
  { questionId: "A01", answerId: "experimenting-with-ideas-and-materials", fieldId: "arts-design", relationship: "supporting" },
  { questionId: "S01", answerId: "how-the-human-body-works", fieldId: "science", relationship: "direct" },
  { questionId: "S01", answerId: "health-and-illness", fieldId: "healthcare", relationship: "direct" },
  { questionId: "S01", answerId: "how-people-grow-and-develop", fieldId: "science", relationship: "direct" },
  { questionId: "P01", answerId: "teaching", fieldId: "education", relationship: "direct" },
  { questionId: "P01", answerId: "listening", fieldId: "social-sciences", relationship: "supporting" },
  { questionId: "P01", answerId: "explaining", fieldId: "education", relationship: "supporting" },
  { questionId: "P01", answerId: "solving-problems-with-people", fieldId: "social-sciences", relationship: "supporting" },
  { questionId: "B01", answerId: "coming-up-with-ideas-for-products-or-services", fieldId: "business", relationship: "direct" },
  { questionId: "B01", answerId: "organising-people-or-activities", fieldId: "business", relationship: "direct" },
  { questionId: "B01", answerId: "understanding-money-and-budgets", fieldId: "business", relationship: "direct" },
  { questionId: "B01", answerId: "communicating-with-customers-or-selling-something", fieldId: "business", relationship: "direct" },
  { questionId: "N01", answerId: "plants", fieldId: "agriculture-environment", relationship: "direct" },
  { questionId: "N01", answerId: "animals", fieldId: "agriculture-environment", relationship: "direct" },
  { questionId: "N01", answerId: "outdoor-exploration", fieldId: "agriculture-environment", relationship: "supporting" },
  { questionId: "N01", answerId: "environmental-topics", fieldId: "agriculture-environment", relationship: "direct" },
  { questionId: "Q002", answerId: "creating-something", fieldId: "technology", relationship: "supporting", contextOptionId: "using-computers-or-technology" },
  { questionId: "Q002", answerId: "creating-something", fieldId: "arts-design", relationship: "supporting", contextOptionId: "drawing-designing-or-making-things" },
  { questionId: "Q002", answerId: "understanding-how-things-work", fieldId: "technology", relationship: "supporting", contextOptionId: "using-computers-or-technology" },
  { questionId: "Q002", answerId: "solving-problems", fieldId: "technology", relationship: "supporting", contextOptionId: "using-computers-or-technology" },
  { questionId: "Q002", answerId: "expressing-ideas", fieldId: "arts-design", relationship: "supporting", contextOptionId: "drawing-designing-or-making-things" },
];

const fieldExplanations: Record<PossibilityField["id"], string> = {
  technology: "Technology explores computers, software and digital systems.",
  engineering: "Engineering explores how practical structures and systems are designed and improved.",
  healthcare: "Healthcare explores protecting health, understanding illness and supporting people’s care.",
  business: "Business & Management explores how organisations manage resources, people and services.",
  law: "Law explores legal systems, rights, responsibilities and justice.",
  government: "Government & Public Service explores how public services and policies support communities.",
  education: "Education explores how people teach, learn and develop.",
  science: "Science & Research explores questions through observation, investigation and evidence.",
  "arts-design": "Arts & Design explores visual communication, creative work and design.",
  media: "Media explores how information and stories are created and shared.",
  "agriculture-environment": "Agriculture & Environment explores food, natural resources and the environment.",
  "hospitality-tourism": "Hospitality & Tourism explores travel, accommodation, food and visitor experiences.",
  "social-sciences": "Social Sciences explores how people live, interact and shape society.",
};

export const counsellingPossibilityMappingVersion = 2;

export const counsellingPossibilityMappings = fieldConnections.map((connection) => {
  const question = counsellingQuestionById.get(connection.questionId);
  const option = question?.options?.find(({ id }) => id === connection.answerId);
  const field = possibilityFields.find(({ id }) => id === connection.fieldId);
  if (!question || !option || !field) {
    throw new Error(
      `Invalid counselling possibility mapping: ${connection.questionId}/${connection.answerId}/${connection.fieldId}`,
    );
  }

  const explanation =
    connection.relationship === "direct"
      ? `You mentioned ${option.label.toLowerCase()}. ${fieldExplanations[field.id]}`
      : connection.relationship === "supporting"
        ? `This adds context to your interest in ${field.name}.`
        : `You mentioned ${option.label.toLowerCase()}. Your follow-up response helps clarify whether ${field.name} is relevant to explore.`;

  return {
    ...connection,
    explanation,
    mappingVersion: counsellingPossibilityMappingVersion,
  };
});

type PossibilityEvidence = {
  answerId: string;
  mappingVersion: number;
  questionText: string;
  selectedAnswers: string[];
  relationship: FieldRelationship;
  explanation: string;
};

type WrittenEvidence = {
  id: string;
  questionId: string;
  questionText: string;
  text: string;
};

export function getCounsellingFieldSuggestions(answers: readonly CounsellingAnswer[]) {
  const matchedConnections = answers.flatMap((answer) => {
    if (answer.responseState !== "answered") return [];
    const question = counsellingQuestionById.get(answer.questionId);
    if (!question) return [];

    return answer.optionIds.flatMap((optionId) => {
      const option = question.options?.find((item) => item.id === optionId);
      if (!option) return [];
      return counsellingPossibilityMappings
        .filter((connection) =>
          connection.questionId === answer.questionId &&
          connection.answerId === optionId &&
          (!connection.contextOptionId || connection.contextOptionId === answer.contextOptionId),
        )
        .map((connection) => ({ answer, question, option, connection }));
    });
  });

  const introducedFields = new Set(
    matchedConnections
      .filter(({ connection }) => connection.relationship === "direct")
      .map(({ connection }) => connection.fieldId),
  );
  const suggestions = new Map<string, {
    field: PossibilityField;
    evidence: Map<string, PossibilityEvidence>;
    writtenEvidence: Map<string, WrittenEvidence>;
  }>();

  for (const { answer, question, option, connection } of matchedConnections) {
    if (
      connection.relationship !== "direct" &&
      !introducedFields.has(connection.fieldId)
    ) continue;
    const field = possibilityFields.find((item) => item.id === connection.fieldId);
    if (!field) continue;

    const suggestion = suggestions.get(field.id) ?? {
      field,
      evidence: new Map(),
      writtenEvidence: new Map(),
    };
    const evidence = suggestion.evidence.get(answer.id) ?? {
      answerId: answer.id,
      mappingVersion: connection.mappingVersion,
      questionText: question.text,
      selectedAnswers: [],
      relationship: connection.relationship,
      explanation: connection.explanation,
    };
    if (!evidence.selectedAnswers.includes(option.label)) {
      evidence.selectedAnswers.push(option.label);
    }
    if (connection.relationship === "direct") {
      evidence.relationship = "direct";
      evidence.explanation = connection.explanation;
    }
    suggestion.evidence.set(answer.id, evidence);
    if (answer.originalText.trim()) {
      const id = `${answer.id}:written`;
      suggestion.writtenEvidence.set(id, {
        id,
        questionId: answer.questionId,
        questionText: question.text,
        text: answer.originalText.trim(),
      });
    }
    suggestions.set(field.id, suggestion);
  }

  return [...suggestions.values()].map(({ field, evidence, writtenEvidence }) => ({
    field,
    evidence: [...evidence.values()],
    writtenEvidence: [...writtenEvidence.values()],
  }));
}

export function getGuidedExploreStartingPoints(session: SessionRead) {
  if (session.status !== "saved" || session.session.status !== "completed") return null;
  return getCounsellingFieldSuggestions(session.session.answers);
}
