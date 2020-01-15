"""Sorting algorithms"""
import math

import scipy.stats as st


def ci_lower_bound(num_positive_ratings, total_rating, confidence):
    """
    Returns a sorting score based on the Wilson score of the ratings

    See: https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
    """
    if total_rating == 0:
        return 0
    z = st.norm.ppf(1 - (1 - confidence) / 2)
    phat = 1.0 * num_positive_ratings / total_rating
    return (
        phat
        + z * z / (2 * total_rating)
        - z * math.sqrt((phat * (1 - phat) + z * z / (4 * total_rating)) / total_rating)
    ) / (1 + z * z / total_rating)
