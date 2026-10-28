# Run from the project root in RStudio: source("scripts/update-scriptures.R")
# Refresh the bundled snapshot; ordinary page knitting needs no data download.
# Requires jsonlite (install.packages("jsonlite") once).
if (!requireNamespace("jsonlite", quietly = TRUE)) stop("Install jsonlite first: install.packages('jsonlite')")
source_url <- "https://kameronyork.com/datasets/scripture-verses.json"
scripture_data <- jsonlite::fromJSON(source_url, simplifyDataFrame = TRUE)
required_columns <- c("verse_id", "overall_book", "book", "chapter", "verse", "scripture", "book_chapter", "text", "book_sub_order", "book_order", "chapter_order")
if (!is.data.frame(scripture_data) || !all(required_columns %in% names(scripture_data)) || nrow(scripture_data) < 40000) {
  stop("Unexpected scripture dataset; the existing snapshot has not been changed.")
}
if (anyDuplicated(scripture_data$verse_id) || anyNA(scripture_data[required_columns])) stop("Dataset contains missing values or duplicate verse IDs.")
scripture_data <- scripture_data[order(scripture_data$verse_id), required_columns]
payload <- list(
  source = source_url,
  columns = as.list(required_columns),
  rows = lapply(seq_len(nrow(scripture_data)), function(i) unname(as.list(scripture_data[i, ])))
)
dir.create("assets/data", recursive = TRUE, showWarnings = FALSE)
destination <- "assets/data/scriptures.json.gz"
temporary <- tempfile(tmpdir = "assets/data", fileext = ".gz")
tryCatch({
  connection <- gzfile(temporary, "wb", compression = 9)
  tryCatch(writeBin(charToRaw(enc2utf8(jsonlite::toJSON(payload, auto_unbox = TRUE, null = "null"))), connection), finally = close(connection))
  if (!file.copy(temporary, destination, overwrite = TRUE)) stop("Could not replace the dataset snapshot.")
}, finally = unlink(temporary))
cat(sprintf("Updated %s with %s verses. Commit this file along with any source changes.\n", destination, format(nrow(scripture_data), big.mark = ",")))
