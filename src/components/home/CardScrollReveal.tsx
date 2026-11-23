"use client";

import React from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { BoxReveal } from "@/components/ui/box-reveal";
import { Card3D } from "@/components/ui/card-3d";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFadeReveal } from "../ui/BlurFadeReveal";
import { LaserScanReveal } from "../ui/LaserScanReveal";
import { PerspectiveDockReveal } from "../ui/PerspectiveDockReveal";
import { RadialIrisReveal } from "../ui/RadialIrisReveal";
import { CurtainSplitReveal } from "../ui/CurtainSplitReveal";

export type RevealMode =
  | "blur-fade"
  | "box-reveal"
  | "3d-card"
  | "border-beam"
  | "Blur-fade-reveal"
  | "laser-scan"
  | "3d-perspective"
  | "radial-iris"
  | "curtain-split"
  | "none";

interface CardScrollRevealProps {
  children: React.ReactNode;
  mode?: RevealMode;
  delay?: number;
}

export default function CardScrollReveal({
  children,
  mode = "none",
  delay = 3,
}: CardScrollRevealProps) {
  if (mode === "none") {
    return <>{children}</>;
  }

  if (mode === "blur-fade") {
    return <BlurFade delay={delay}>{children}</BlurFade>;
  }

  if (mode === "box-reveal") {
    return <BoxReveal delay={delay}>{children}</BoxReveal>;
  }

  if (mode === "3d-card") {
    return <Card3D>{children}</Card3D>;
  }

  if (mode === "border-beam") {
    return <BorderBeam>{children}</BorderBeam>;
  }

  if (mode == "Blur-fade-reveal") {
    return <BlurFadeReveal delay={delay}>{children}</BlurFadeReveal>
  }

  if (mode == "laser-scan"){
    return <LaserScanReveal delay={delay}>{children}</LaserScanReveal>
  }

  if (mode == "3d-perspective") {
    return <PerspectiveDockReveal delay={delay}>{children}</PerspectiveDockReveal>
  }

  if (mode == "radial-iris") {
    return <RadialIrisReveal delay={delay}>{children}</RadialIrisReveal>
  }

  if (mode == "curtain-split") {
    return <CurtainSplitReveal delay={delay}>{children}</CurtainSplitReveal>
  }

  return <>{children}</>;
}