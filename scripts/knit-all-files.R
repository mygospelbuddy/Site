# scripts/knit-all-files.R
#
# Knits every .Rmd in this project and writes each .html next to its
# source file (same behavior as knitting a single file in RStudio, just
# looped over the whole site).
#
# Run this from RStudio with the Site.Rproj open (so the working directory
# is the project root), or from a terminal with:
#   Rscript scripts/knit-all-files.R
#
# Previously this script hardcoded a Windows desktop path to a different,
# unrelated project ("kameronyork.com") and only looked in a "parables"
# folder that doesn't exist in this repo -- it could not have worked as-is.

library(rmarkdown)
library(here)

# Make sure paths are resolved from the project root regardless of where
# this script is run from.
project_root <- here::here()

# Every .Rmd in the project, except drafts (leading underscore folders are
# intentionally excluded -- that's where work-in-progress pages live).
rmd_files <- list.files(
  project_root,
  pattern = "\\.[Rr]md$",
  full.names = TRUE,
  recursive = TRUE
)
rmd_files <- rmd_files[!grepl("/_drafts/", rmd_files)]

cat(sprintf("Found %d .Rmd file(s) to knit:\n", length(rmd_files)))
cat(paste(" -", rmd_files), sep = "\n")
cat("\n")

for (file in rmd_files) {
  cat(sprintf("Rendering: %s\n", file))
  tryCatch(
    rmarkdown::render(file, quiet = TRUE),
    error = function(e) {
      message(sprintf("  FAILED: %s\n  %s", file, conditionMessage(e)))
    }
  )
}

cat("\nDone.\n")
