const balancedLines = Array.from(document.querySelectorAll("[data-balance-line]"));
    const followupBalancedLines = Array.from(document.querySelectorAll("[data-balance-followup-line]"));
    const openingHeadline = document.querySelector("[data-opening-headline]");
    const followupHeadline = document.querySelector("[data-followup-headline]");
    const brandmark = document.querySelector("[data-brandmark]");
    const brandmarkWordmark = document.querySelector("[data-brandmark-wordmark]");
    const brandmarkSubheading = document.querySelector("[data-brandmark-subheading]");
    const headlineColumn = document.querySelector(".headline-column");
    const sparkleLayer = document.querySelector(".sparkle-layer");
    const sparkleMarkup = `
      <svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="m21.137 11.519-2.726-.779a7.453 7.453 0 0 1 -5.151-5.151l-.779-2.726a.52.52 0 0 0 -.962 0l-.779 2.726a7.453 7.453 0 0 1 -5.151 5.151l-2.726.779a.5.5 0 0 0 0 .962l2.726.779a7.453 7.453 0 0 1 5.151 5.151l.779 2.726a.5.5 0 0 0 .962 0l.779-2.726a7.453 7.453 0 0 1 5.151-5.151l2.726-.779a.5.5 0 0 0 0-.962z" fill="#5A3E6B"/>
      </svg>
    `;

    function cacheBalancedLineBaseSpacing(line) {
      if (line.dataset.basePadStartPx && line.dataset.basePadEndPx) {
        return;
      }

      const styles = getComputedStyle(line);
      line.dataset.basePadStartPx = `${Number.parseFloat(styles.paddingInlineStart) || 0}`;
      line.dataset.basePadEndPx = `${Number.parseFloat(styles.paddingInlineEnd) || 0}`;
    }

    function resetBalancedLine(line) {
      cacheBalancedLineBaseSpacing(line);

      line.style.fontSize = "1em";
      line.style.letterSpacing = "";
      line.style.paddingInlineStart = `${Number.parseFloat(line.dataset.basePadStartPx) || 0}px`;
      line.style.paddingInlineEnd = `${Number.parseFloat(line.dataset.basePadEndPx) || 0}px`;

      line.querySelectorAll(".hero-headline-highlight, .hero-headline-serif").forEach((element) => {
        element.style.letterSpacing = "";
      });
    }

    function setBalancedLineScale(line, scale, baseLetterSpacingEm) {
      line.style.fontSize = `${scale}em`;
      line.style.letterSpacing = `${baseLetterSpacingEm / scale}em`;

      line.querySelectorAll(".hero-headline-highlight, .hero-headline-serif").forEach((element) => {
        const inlineLetterSpacingEm = Number.parseFloat(
          getComputedStyle(element).getPropertyValue("--hero-inline-letter-spacing-em")
        );

        if (Number.isNaN(inlineLetterSpacingEm)) {
          element.style.letterSpacing = "";
          return;
        }

        element.style.letterSpacing = `${inlineLetterSpacingEm / scale}em`;
      });
    }

    function findScaleForTargetWidth(line, targetWidth, baseLetterSpacingEm) {
      const initialWidth = line.getBoundingClientRect().width;

      if (!initialWidth || Math.abs(targetWidth - initialWidth) < 0.5) {
        return 1;
      }

      let low = 1;
      let high = Math.max(1.05, (targetWidth / initialWidth) * 1.15);

      setBalancedLineScale(line, high, baseLetterSpacingEm);

      while (line.getBoundingClientRect().width < targetWidth && high < 4) {
        high *= 1.08;
        setBalancedLineScale(line, high, baseLetterSpacingEm);
      }

      for (let iteration = 0; iteration < 18; iteration += 1) {
        const mid = (low + high) / 2;
        setBalancedLineScale(line, mid, baseLetterSpacingEm);

        if (line.getBoundingClientRect().width < targetWidth) {
          low = mid;
        } else {
          high = mid;
        }
      }

      return high;
    }

    function getGroupTargetWidth(lines) {
      if (!lines.length) {
        return 0;
      }

      lines.forEach(resetBalancedLine);
      return Math.max(...lines.map((line) => line.getBoundingClientRect().width));
    }

    function balanceLineGroup(lines, options = {}) {
      if (!lines.length) {
        return;
      }

      const {
        maxScale = Number.POSITIVE_INFINITY,
        padInlineStart = false,
        padInlineEnd = false,
        targetWidth = null,
      } = options;

      const headline = lines[0].closest(".hero-headline");
      const baseLetterSpacingEm = Number.parseFloat(
        getComputedStyle(headline).getPropertyValue("--hero-letter-spacing-em")
      ) || -0.05;

      lines.forEach(resetBalancedLine);

      if (window.matchMedia("(max-width: 900px)").matches) {
        return;
      }

      const widths = lines.map((line) => line.getBoundingClientRect().width);
      const resolvedTargetWidth = targetWidth ?? Math.max(...widths);

      lines.forEach((line, index) => {
        const width = widths[index];

        if (!width) {
          return;
        }

        const exactScale = findScaleForTargetWidth(line, resolvedTargetWidth, baseLetterSpacingEm);
        const appliedScale = Math.min(exactScale, maxScale);

        setBalancedLineScale(line, appliedScale, baseLetterSpacingEm);

        const remainingWidth = Math.max(resolvedTargetWidth - line.getBoundingClientRect().width, 0);
        const basePadStartPx = Number.parseFloat(line.dataset.basePadStartPx) || 0;
        const basePadEndPx = Number.parseFloat(line.dataset.basePadEndPx) || 0;

        if (padInlineStart) {
          line.style.paddingInlineStart = `${basePadStartPx + remainingWidth}px`;
        }

        if (padInlineEnd) {
          line.style.paddingInlineEnd = `${basePadEndPx + remainingWidth}px`;
        }
      });
    }

    function balanceHeroLines() {
      const sharedTargetWidth = Math.max(
        getGroupTargetWidth(balancedLines),
        getGroupTargetWidth(followupBalancedLines)
      );

      balanceLineGroup(balancedLines, {
        targetWidth: sharedTargetWidth,
      });
      balanceLineGroup(followupBalancedLines, {
        targetWidth: sharedTargetWidth,
        maxScale: 1.08,
        padInlineStart: true,
      });
      sizeBrandmarkSubheading();
    }

    function sizeBrandmarkSubheading() {
      if (!brandmark || !brandmarkWordmark || !brandmarkSubheading) {
        return;
      }

      const wordmarkWidth = brandmarkWordmark.getBoundingClientRect().width;
      const targetWidth = wordmarkWidth * 0.7;
      brandmark.style.setProperty("--brandmark-width", `${wordmarkWidth}px`);
      brandmark.style.setProperty("--brandmark-subheading-tracking", "0px");
      brandmarkSubheading.style.width = "";

      const baseWidth = brandmarkSubheading.getBoundingClientRect().width;

      if (!targetWidth || !baseWidth) {
        return;
      }

      if (baseWidth >= targetWidth) {
        brandmarkSubheading.style.width = `${targetWidth}px`;
        return;
      }

      let low = 0;
      let high = Math.max(1, targetWidth - baseWidth);

      for (let iteration = 0; iteration < 18; iteration += 1) {
        const mid = (low + high) / 2;
        brandmark.style.setProperty("--brandmark-subheading-tracking", `${mid}px`);

        if (brandmarkSubheading.getBoundingClientRect().width < targetWidth) {
          low = mid;
        } else {
          high = mid;
        }
      }

      brandmark.style.setProperty("--brandmark-subheading-tracking", `${high}px`);
      brandmarkSubheading.style.width = `${targetWidth}px`;
    }

    window.addEventListener("load", balanceHeroLines);
    window.addEventListener("resize", balanceHeroLines);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        balanceHeroLines();
        updateHeroTransition();
      });
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function mapRange(value, inStart, inEnd) {
      return clamp((value - inStart) / (inEnd - inStart), 0, 1);
    }

    function updateHeroTransition() {
      if (!openingHeadline || !followupHeadline || !brandmark || !headlineColumn) {
        return;
      }

      if (reducedMotionQuery.matches) {
        const rect = headlineColumn.getBoundingClientRect();
        const total = Math.max(rect.height - window.innerHeight, 1);
        const progress = clamp(-rect.top / total, 0, 1);
        const showFollowup = progress > 0.34 && progress <= 0.68;
        const showBrandmark = progress > 0.68;

        openingHeadline.style.opacity = showFollowup || showBrandmark ? "0" : "1";
        openingHeadline.style.transform = "translateY(0)";
        openingHeadline.style.filter = "none";
        followupHeadline.style.opacity = showFollowup ? "1" : "0";
        followupHeadline.style.transform = "translateY(0)";
        followupHeadline.style.filter = "none";
        brandmark.style.opacity = showBrandmark ? "1" : "0";
        brandmark.style.transform = "translateY(0)";
        brandmark.style.filter = "none";
        return;
      }

      const rect = headlineColumn.getBoundingClientRect();
      const total = Math.max(rect.height - window.innerHeight, 1);
      const progress = clamp(-rect.top / total, 0, 1);
      const openingFadeOut = mapRange(progress, 0.08, 0.28);
      const followupFadeIn = mapRange(progress, 0.24, 0.46);
      const followupFadeOut = mapRange(progress, 0.58, 0.74);
      const brandmarkFadeIn = mapRange(progress, 0.70, 0.92);

      openingHeadline.style.opacity = String(1 - openingFadeOut);
      openingHeadline.style.transform = `translateY(${openingFadeOut * -18}px)`;
      openingHeadline.style.filter = `blur(${openingFadeOut * 8}px)`;

      followupHeadline.style.opacity = String(followupFadeIn * (1 - followupFadeOut));
      followupHeadline.style.transform = `translateY(${((1 - followupFadeIn) * 18) + (followupFadeOut * -18)}px)`;
      followupHeadline.style.filter = `blur(${((1 - followupFadeIn) * 8) + (followupFadeOut * 8)}px)`;

      brandmark.style.opacity = String(brandmarkFadeIn);
      brandmark.style.transform = `translateY(${(1 - brandmarkFadeIn) * 18}px)`;
      brandmark.style.filter = `blur(${(1 - brandmarkFadeIn) * 8}px)`;
    }

    const cursorQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let lastSparkleTime = 0;
    let lastSparkleX = null;
    let lastSparkleY = null;

    function enableCustomCursor() {
      if (!cursorQuery.matches) {
        document.body.classList.remove("cursor-ready", "cursor-visible");
        return;
      }

      document.body.classList.add("cursor-ready");
    }

    function updateCursorPosition(event) {
      if (!cursorQuery.matches) {
        return;
      }

      document.body.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.body.style.setProperty("--cursor-y", `${event.clientY}px`);
      document.body.classList.add("cursor-visible");
      maybeSpawnSparkle(event.clientX, event.clientY);
    }

    function hideCustomCursor() {
      document.body.classList.remove("cursor-visible");
    }

    function maybeSpawnSparkle(x, y) {
      const now = performance.now();

      if (lastSparkleX === null || lastSparkleY === null) {
        lastSparkleX = x;
        lastSparkleY = y;
        lastSparkleTime = now;
        return;
      }

      const distance = Math.hypot(x - lastSparkleX, y - lastSparkleY);

      if (distance < 6 || now - lastSparkleTime < 18) {
        return;
      }

      lastSparkleX = x;
      lastSparkleY = y;
      lastSparkleTime = now;

      spawnSparkle(x + randomBetween(-4, 6), y + randomBetween(-4, 4), false);

      if (Math.random() > 0.25) {
        spawnSparkle(x + randomBetween(-10, 12), y + randomBetween(-10, 8), true);
      }
    }

    function spawnSparkle(x, y, subtle) {
      if (!sparkleLayer) {
        return;
      }

      const sparkle = document.createElement("span");
      sparkle.className = "trail-sparkle";
      sparkle.innerHTML = sparkleMarkup;

      const sizes = subtle ? [7, 9, 11] : [11, 13, 15, 18];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const duration = subtle ? randomBetween(560, 820) : randomBetween(720, 980);
      const opacity = subtle ? randomBetween(0.18, 0.28) : randomBetween(0.28, 0.42);

      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.setProperty("--sparkle-size", `${size}px`);
      sparkle.style.setProperty("--sparkle-duration", `${duration}ms`);
      sparkle.style.setProperty("--sparkle-opacity", opacity.toFixed(2));
      sparkle.style.setProperty("--sparkle-rotation", `${randomBetween(-22, 22)}deg`);
      sparkle.style.setProperty("--sparkle-drift-x", `${randomBetween(-10, 12)}px`);
      sparkle.style.setProperty("--sparkle-drift-y", `${randomBetween(-18, -6)}px`);

      sparkleLayer.appendChild(sparkle);
      sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
    }

    function randomBetween(min, max) {
      return Math.random() * (max - min) + min;
    }

    window.addEventListener("mousemove", updateCursorPosition, { passive: true });
    window.addEventListener("scroll", updateHeroTransition, { passive: true });
    window.addEventListener("resize", updateHeroTransition);
    document.addEventListener("mouseleave", hideCustomCursor);
    cursorQuery.addEventListener("change", enableCustomCursor);
    reducedMotionQuery.addEventListener("change", updateHeroTransition);

    enableCustomCursor();
    updateHeroTransition();
