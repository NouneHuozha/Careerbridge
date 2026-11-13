export const activityOptions = [
  {
    id: "fixing",
    label: "Fixing or building things",
    description: "Repairing or making useful things",
  },
  {
    id: "helping",
    label: "Helping or caring for people",
    description: "Supporting, caring or helping others",
  },
  {
    id: "outdoors",
    label: "Being outdoors with plants or animals",
    description: "Plants, animals or nature",
  },
  {
    id: "computers",
    label: "Using computers or phones",
    description: "Apps, devices or the internet",
  },
  {
    id: "organising",
    label: "Organising activities or plans",
    description: "Planning events or group tasks",
  },
  {
    id: "creative",
    label: "Drawing, designing or making things",
    description: "Art, crafts or creative projects",
  },
  {
    id: "numbers",
    label: "Working with numbers or information",
    description: "Calculations or organising information",
  },
  {
    id: "teaching",
    label: "Teaching or explaining things",
    description: "Helping someone understand something",
  },
  {
    id: "talking",
    label: "Talking with people and sharing ideas",
    description: "Sharing ideas and talking with others",
  },
  {
    id: "problem-solving",
    label: "Solving problems and figuring things out",
    description: "Thinking through challenges",
  },
] as const;

export type ActivityId = (typeof activityOptions)[number]["id"];
